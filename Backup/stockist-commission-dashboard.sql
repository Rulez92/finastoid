-- ════════════════════════════════════════════════════════════════════════
-- STOCKIST PORTAL: commission dashboard numbers (read-only)
-- Safe to re-run. One transaction. Does NOT touch any existing function,
-- table, trigger or the associate_* system. The old my_stockist_dashboard
-- stays in place, unused.
--
-- One function, my_stockist_commission_dashboard(p_range), returns one jsonb:
--
--   range, bucket                 'day' or 'month'
--   summary                       { available_usd, pending_usd, in_review_usd, paid_usd }
--                                 straight from stockist_earnings_summary(), so the
--                                 cards always match the Payouts page
--   active_affiliates             affiliates assigned to me with status 'active'
--   period                        { commission_usd, orders, sales_usd } for the chart range
--   daily                         [{ day, commission_usd, orders }] one point per day/month
--   top_affiliates                top 5 by verified sales in the chart range
--                                 [{ name, orders, sales_usd, commission_usd }]
--   recent                        latest 5 commissions (all time)
--                                 [{ order_number, affiliate_name, commission_percent,
--                                    commission_usd, order_total_usd, created_at, status }]
--                                 status: pending | available | in_review | paid
--                                         | refunded | cancelled
--
-- "Verified sale" = order payment_status 'paid' and status <> 'cancelled'.
-- Refunded orders drop out of the chart, the totals and the top list.
-- Money is computed here, never in the browser.
--
-- Joins: stockist_commissions.affiliate_id -> affiliates.id (names).
-- orders.affiliate_id / orders.stockist_id are profile ids and are NOT used
-- to join to affiliates here.
-- ════════════════════════════════════════════════════════════════════════

begin;

create or replace function public.my_stockist_commission_dashboard(
  p_range text default '30d'
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_range      text := coalesce(p_range, '30d');
  v_today      date := (now() at time zone 'utc')::date;
  v_bucket     text := 'day';
  v_step       interval := interval '1 day';
  v_start      date;
  v_series_end date := (now() at time zone 'utc')::date;  -- last bucket shown
  v_to         date := (now() at time zone 'utc')::date;  -- last day counted
  v_stockist   uuid;
  v_sum        record;
  v_affiliates integer;
  v_period     jsonb;
  v_daily      jsonb;
  v_top        jsonb;
  v_recent     jsonb;
begin
  if not public.is_stockist() then
    raise exception 'Not authorized';
  end if;

  v_stockist := public.my_stockist_id();
  if v_stockist is null then
    raise exception 'Not authorized';
  end if;

  if v_range = '7d' then
    v_start := v_today - 6;
  elsif v_range = '30d' then
    v_start := v_today - 29;
  elsif v_range = '90d' then
    v_start := v_today - 89;
  elsif v_range = 'last_month' then
    v_start := (date_trunc('month', v_today::timestamp) - interval '1 month')::date;
    v_series_end := date_trunc('month', v_today::timestamp)::date - 1;
    v_to := v_series_end;
  elsif v_range = '12m' then
    v_bucket := 'month';
    v_step := interval '1 month';
    v_start := (date_trunc('month', v_today::timestamp) - interval '11 months')::date;
    v_series_end := date_trunc('month', v_today::timestamp)::date;
  else
    raise exception 'Invalid range';
  end if;

  -- Card numbers: same source as the Payouts page.
  select * into v_sum from public.stockist_earnings_summary(v_stockist);

  -- Affiliates currently assigned to me.
  select count(*)::integer into v_affiliates
  from public.affiliates a
  where a.stockist_id = v_stockist
    and a.status = 'active';

  -- Totals for the chosen period (verified sales only).
  select jsonb_build_object(
           'commission_usd', coalesce(sum(c.commission_usd), 0),
           'orders',         count(*),
           'sales_usd',      coalesce(sum(c.order_total_usd), 0)
         )
    into v_period
  from public.stockist_commissions c
  join public.orders o on o.id = c.order_id
  where c.stockist_id = v_stockist
    and o.payment_status = 'paid'
    and o.status <> 'cancelled'
    and (c.created_at at time zone 'utc')::date between v_start and v_to;

  -- Chart series: one point per day (or per month for 12m), gaps filled with 0.
  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'day',            to_char(d.day, 'YYYY-MM-DD'),
               'commission_usd', coalesce(a.commission_usd, 0),
               'orders',         coalesce(a.orders, 0)
             )
             order by d.day
           ),
           '[]'::jsonb
         )
    into v_daily
  from (
    select g::date as day
    from generate_series(v_start, v_series_end, v_step) as g
  ) d
  left join (
    select
      date_trunc(v_bucket, (c.created_at at time zone 'utc'))::date as day,
      sum(c.commission_usd) as commission_usd,
      count(*)              as orders
    from public.stockist_commissions c
    join public.orders o on o.id = c.order_id
    where c.stockist_id = v_stockist
      and o.payment_status = 'paid'
      and o.status <> 'cancelled'
      and (c.created_at at time zone 'utc')::date between v_start and v_to
    group by 1
  ) a on a.day = d.day;

  -- Top 5 affiliates by verified sales in the chosen period.
  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'name',           x.name,
               'orders',         x.orders,
               'sales_usd',      x.sales_usd,
               'commission_usd', x.commission_usd
             )
             order by x.sales_usd desc, x.name
           ),
           '[]'::jsonb
         )
    into v_top
  from (
    select
      coalesce(nullif(btrim(a.name), ''), 'Affiliate') as name,
      count(*)::integer                                as orders,
      sum(c.order_total_usd)                           as sales_usd,
      sum(c.commission_usd)                            as commission_usd
    from public.stockist_commissions c
    join public.orders o     on o.id = c.order_id
    join public.affiliates a on a.id = c.affiliate_id
    where c.stockist_id = v_stockist
      and o.payment_status = 'paid'
      and o.status <> 'cancelled'
      and (c.created_at at time zone 'utc')::date between v_start and v_to
    group by a.id, a.name
    order by sum(c.order_total_usd) desc, a.name
    limit 5
  ) x;

  -- Latest 5 commissions (all time), each with its current state.
  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'order_number',       x.order_number,
               'affiliate_name',     x.affiliate_name,
               'commission_percent', x.commission_percent,
               'commission_usd',     x.commission_usd,
               'order_total_usd',    x.order_total_usd,
               'created_at',         x.created_at,
               'status',             x.status
             )
             order by x.created_at desc, x.order_number
           ),
           '[]'::jsonb
         )
    into v_recent
  from (
    select
      c.order_number,
      coalesce(nullif(btrim(a.name), ''), 'Affiliate') as affiliate_name,
      c.commission_percent,
      c.commission_usd,
      c.order_total_usd,
      c.created_at,
      case
        when o.payment_status = 'refunded'        then 'refunded'
        when o.status = 'cancelled'               then 'cancelled'
        when pr.req_status = 'paid'               then 'paid'
        when pr.req_status in ('requested', 'approved') then 'in_review'
        when o.payment_status = 'paid'
             and o.status in ('shipped', 'delivered')
             and o.refund_window_ends_at is not null
             and o.refund_window_ends_at <= now() then 'available'
        else 'pending'
      end as status
    from public.stockist_commissions c
    join public.orders o     on o.id = c.order_id
    join public.affiliates a on a.id = c.affiliate_id
    left join lateral (
      select r.status as req_status
      from public.stockist_payout_request_items i
      join public.stockist_payout_requests r on r.id = i.payout_request_id
      where i.order_id = c.order_id
        and i.is_active
      limit 1
    ) pr on true
    where c.stockist_id = v_stockist
    order by c.created_at desc, c.order_number
    limit 5
  ) x;

  return jsonb_build_object(
    'range',  v_range,
    'bucket', v_bucket,
    'summary', jsonb_build_object(
      'available_usd', coalesce(v_sum.available_usd, 0),
      'pending_usd',   coalesce(v_sum.pending_usd, 0),
      'in_review_usd', coalesce(v_sum.in_review_usd, 0),
      'paid_usd',      coalesce(v_sum.paid_usd, 0)
    ),
    'active_affiliates', v_affiliates,
    'period',            v_period,
    'daily',             v_daily,
    'top_affiliates',    v_top,
    'recent',            v_recent
  );
end;
$function$;

-- Only signed-in users may call it (the function also checks is_stockist()).
revoke all on function public.my_stockist_commission_dashboard(text) from public;
revoke all on function public.my_stockist_commission_dashboard(text) from anon;
grant execute on function public.my_stockist_commission_dashboard(text) to authenticated;

commit;

-- ── Quick test (run separately, replace the uuid with a stockist's LOGIN id,
--    i.e. stockists.profile_id). Returns zeros until real commissions exist.
--
-- begin;
-- select set_config('request.jwt.claims',
--   '{"sub":"<stockists.profile_id>","role":"authenticated"}', true);
-- set local role authenticated;
-- select jsonb_pretty(public.my_stockist_commission_dashboard('30d'));
-- rollback;