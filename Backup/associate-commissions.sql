-- ════════════════════════════════════════════════════════════════════════
-- FINASTO — ASSOCIATE PROGRAM, STEP 4: associate commission ledger
-- Run AFTER associate-approval.sql. Safe to re-run. ONE transaction.
--
-- Rules
--   * The ledger is APPEND-ONLY. A mistake or a refund is a reversal row,
--     never an edit or a delete (a trigger blocks UPDATE and DELETE).
--   * One 'earn' row per (order, source) and one 'reversal' row per
--     (order, source), enforced by a unique index, so a sale can never pay
--     twice, however many times a trigger or a backfill runs.
--   * Amount = round(orders.total_base x rate / 100, 2), where total_base is
--     the USD snapshot your orders already store, and the rate is the
--     associate's rate at the moment the order is paid. Changing a package
--     later never alters existing rows.
--   * Two sources, each switchable by the admin:
--       'network'      the order belongs to an affiliate assigned to the
--                      associate (orders.stockist_id = the associate)
--       'own_referral' the order came through the associate's own referral
--                      link (orders.affiliate_id = the associate)
--     The affiliate commission on the same order is untouched: it stays on
--     orders.affiliate_commission_percent and your existing payout flow.
--   * Only orders paid AFTER the associate joined earn commission.
--   * An associate never earns on an order bought with their own email.
--   * Nobody writes to the ledger directly. Triggers and SECURITY DEFINER
--     functions do.
--   * Not in this file: paying the ledger out (File 5).
-- ════════════════════════════════════════════════════════════════════════

begin;

-- ────────────────────────────────────────────────────────────────────────
-- 0) Pre-flight checks
-- ────────────────────────────────────────────────────────────────────────
do $$
begin
  if to_regprocedure('public.is_admin()') is null then
    raise exception 'public.is_admin() is missing.';
  end if;
  if to_regprocedure('public.touch_updated_at()') is null then
    raise exception 'public.touch_updated_at() is missing.';
  end if;
  if to_regprocedure('public.current_stockist_id()') is null then
    raise exception 'public.current_stockist_id() is missing.';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stockists'
      and column_name = 'associate_commission_percent'
  ) then
    raise exception 'stockists.associate_commission_percent is missing. Run associate-approval.sql first.';
  end if;
end $$;


-- ────────────────────────────────────────────────────────────────────────
-- 1) Admin switches (one row)
--    Whether one sale may pay the associate through the network, through
--    their own referral link, or both. Both are on by default.
-- ────────────────────────────────────────────────────────────────────────
create table if not exists public.associate_commission_settings (
  id               boolean primary key default true check (id),
  pay_network      boolean not null default true,
  pay_own_referral boolean not null default true,
  updated_at       timestamptz not null default now()
);

insert into public.associate_commission_settings (id) values (true)
on conflict (id) do nothing;

drop trigger if exists associate_commission_settings_touch_updated_at
  on public.associate_commission_settings;
create trigger associate_commission_settings_touch_updated_at
  before update on public.associate_commission_settings
  for each row execute function public.touch_updated_at();

alter table public.associate_commission_settings enable row level security;

drop policy if exists "admin manages associate commission settings"
  on public.associate_commission_settings;
create policy "admin manages associate commission settings"
  on public.associate_commission_settings for all
  using (public.is_admin())
  with check (public.is_admin());


-- ────────────────────────────────────────────────────────────────────────
-- 2) associate_commission_entries — the ledger
-- ────────────────────────────────────────────────────────────────────────
create table if not exists public.associate_commission_entries (
  id                 uuid primary key default gen_random_uuid(),
  stockist_id        uuid not null references public.stockists(id) on delete restrict,
  order_id           uuid not null references public.orders(id)    on delete restrict,

  source             text not null check (source in ('network', 'own_referral')),
  entry_type         text not null check (entry_type in ('earn', 'reversal')),

  -- Snapshots, so history stays correct if the order or package changes.
  order_number       text not null,
  order_total_usd    numeric(12,2) not null check (order_total_usd > 0),
  package_code       text not null,
  commission_percent numeric(5,2) not null
                       check (commission_percent > 0 and commission_percent <= 100),

  -- Positive for 'earn', negative for 'reversal'.
  amount_usd         numeric(12,2) not null,
  reverses_entry_id  uuid references public.associate_commission_entries(id) on delete restrict,

  created_at         timestamptz not null default now(),

  constraint associate_entries_sign_matches_type
    check ((entry_type = 'earn'     and amount_usd > 0)
        or (entry_type = 'reversal' and amount_usd < 0)),
  constraint associate_entries_reversal_links_entry
    check ((entry_type = 'reversal') = (reverses_entry_id is not null))
);

-- A sale can never pay (or be reversed) twice for the same source.
create unique index if not exists associate_entries_once_idx
  on public.associate_commission_entries (order_id, source, entry_type);

create index if not exists associate_entries_stockist_idx
  on public.associate_commission_entries (stockist_id, created_at desc);

-- Append-only: no edits, no deletes, for anyone (the owner included).
create or replace function public.associate_entries_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'The commission ledger is append-only. Add a reversal entry instead.';
end;
$$;

drop trigger if exists associate_entries_no_update on public.associate_commission_entries;
create trigger associate_entries_no_update
  before update or delete on public.associate_commission_entries
  for each row execute function public.associate_entries_append_only();

alter table public.associate_commission_entries enable row level security;

-- Read only. No insert/update/delete policies: all writes go through the
-- functions below.
drop policy if exists "admin reads associate entries" on public.associate_commission_entries;
create policy "admin reads associate entries"
  on public.associate_commission_entries for select
  using (public.is_admin());

-- Keyed on the database record (not the JWT role), so it keeps working for
-- someone who is both an associate and an affiliate.
drop policy if exists "associate reads own entries" on public.associate_commission_entries;
create policy "associate reads own entries"
  on public.associate_commission_entries for select
  using (stockist_id = public.current_stockist_id());


-- ────────────────────────────────────────────────────────────────────────
-- 3) Internal writers (nobody can call these directly; only the trigger
--    function and the admin backfill below do)
-- ────────────────────────────────────────────────────────────────────────

-- 3a) Record the 'earn' rows for one paid order. Returns how many were added.
create or replace function public._record_associate_commission(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  o       public.orders%rowtype;
  cfg     public.associate_commission_settings%rowtype;
  st      public.stockists%rowtype;
  v_amt   numeric(12,2);
  v_rows  integer;
  v_count integer := 0;
  v_when  timestamptz;
begin
  select * into o from public.orders where id = p_order_id;
  if not found
     or o.payment_status <> 'paid'
     or coalesce(o.total_base, 0) <= 0 then
    return 0;
  end if;
  v_when := coalesce(o.paid_at, o.created_at);

  select * into cfg from public.associate_commission_settings where id;

  -- Network: the order belongs to an affiliate assigned to this associate.
  if coalesce(cfg.pay_network, true) and o.stockist_id is not null then
    select * into st
    from public.stockists s
    where s.profile_id = o.stockist_id
      and s.associate_package_id is not null
      and s.status = 'active'
    limit 1;

    if found
       and st.associate_commission_percent > 0
       and v_when >= st.associate_since
       and lower(btrim(coalesce(o.customer_email, ''))) <> lower(btrim(st.email))
    then
      v_amt := round(o.total_base * st.associate_commission_percent / 100, 2);
      if v_amt > 0 then
        insert into public.associate_commission_entries
          (stockist_id, order_id, source, entry_type, order_number,
           order_total_usd, package_code, commission_percent, amount_usd)
        values
          (st.id, o.id, 'network', 'earn', o.order_number,
           o.total_base, st.associate_package_code,
           st.associate_commission_percent, v_amt)
        on conflict do nothing;
        get diagnostics v_rows = row_count;
        v_count := v_count + v_rows;
      end if;
    end if;
  end if;

  -- Own referral: the order came through this associate's own link.
  if coalesce(cfg.pay_own_referral, true) and o.affiliate_id is not null then
    select * into st
    from public.stockists s
    where s.profile_id = o.affiliate_id
      and s.associate_package_id is not null
      and s.status = 'active'
    limit 1;

    if found
       and st.associate_commission_percent > 0
       and v_when >= st.associate_since
       and lower(btrim(coalesce(o.customer_email, ''))) <> lower(btrim(st.email))
    then
      v_amt := round(o.total_base * st.associate_commission_percent / 100, 2);
      if v_amt > 0 then
        insert into public.associate_commission_entries
          (stockist_id, order_id, source, entry_type, order_number,
           order_total_usd, package_code, commission_percent, amount_usd)
        values
          (st.id, o.id, 'own_referral', 'earn', o.order_number,
           o.total_base, st.associate_package_code,
           st.associate_commission_percent, v_amt)
        on conflict do nothing;
        get diagnostics v_rows = row_count;
        v_count := v_count + v_rows;
      end if;
    end if;
  end if;

  return v_count;
end;
$$;

-- 3b) Reverse every 'earn' row of a refunded order.
create or replace function public._reverse_associate_commission(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer;
begin
  insert into public.associate_commission_entries
    (stockist_id, order_id, source, entry_type, order_number,
     order_total_usd, package_code, commission_percent, amount_usd,
     reverses_entry_id)
  select e.stockist_id, e.order_id, e.source, 'reversal', e.order_number,
         e.order_total_usd, e.package_code, e.commission_percent,
         -e.amount_usd, e.id
  from public.associate_commission_entries e
  where e.order_id = p_order_id and e.entry_type = 'earn'
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

revoke all on function public._record_associate_commission(uuid)  from public, anon, authenticated;
revoke all on function public._reverse_associate_commission(uuid) from public, anon, authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 4) Triggers on orders (additive: your existing triggers are untouched)
--    A failure here must NEVER block a customer's payment or a refund, so it
--    is turned into a warning. The admin backfill below catches anything
--    that was missed.
-- ────────────────────────────────────────────────────────────────────────
create or replace function public.trg_associate_commission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    if new.payment_status = 'paid' then
      perform public._record_associate_commission(new.id);
    elsif new.payment_status = 'refunded' then
      perform public._reverse_associate_commission(new.id);
    end if;
  exception when others then
    raise warning 'associate commission failed for order %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.trg_associate_commission() from public, anon, authenticated;

drop trigger if exists orders_associate_commission_insert on public.orders;
create trigger orders_associate_commission_insert
  after insert on public.orders
  for each row
  when (new.payment_status = 'paid')
  execute function public.trg_associate_commission();

drop trigger if exists orders_associate_commission_update on public.orders;
create trigger orders_associate_commission_update
  after update of payment_status on public.orders
  for each row
  when (new.payment_status in ('paid', 'refunded')
        and old.payment_status is distinct from new.payment_status)
  execute function public.trg_associate_commission();


-- ────────────────────────────────────────────────────────────────────────
-- 5) Admin backfill: record any paid order that has no entry yet (for
--    example if a trigger warning was logged). Safe to run repeatedly.
-- ────────────────────────────────────────────────────────────────────────
create or replace function public.backfill_associate_commissions(
  p_limit integer default 500
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r       record;
  v_total integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  for r in
    select o.id
    from public.orders o
    where o.payment_status = 'paid'
      and o.total_base is not null and o.total_base > 0
      and exists (
        select 1 from public.stockists s
        where s.associate_package_id is not null
          and s.status = 'active'
          and (s.profile_id = o.stockist_id or s.profile_id = o.affiliate_id)
          and coalesce(o.paid_at, o.created_at) >= s.associate_since
      )
      and not exists (
        select 1 from public.associate_commission_entries e
        where e.order_id = o.id
      )
    order by o.created_at
    limit least(greatest(coalesce(p_limit, 500), 1), 2000)
  loop
    v_total := v_total + public._record_associate_commission(r.id);
  end loop;

  return v_total;
end;
$$;


-- ────────────────────────────────────────────────────────────────────────
-- 6) Associate reads (the associate dashboard uses only these)
-- ────────────────────────────────────────────────────────────────────────

-- 6a) My ledger, newest first. 'payable' = the order is shipped or delivered,
--     the refund window has passed and it has not been reversed. Customer
--     details are never returned.
create or replace function public.my_associate_commissions(
  p_limit  integer default 20,
  p_offset integer default 0
)
returns table (
  id                 uuid,
  entry_type         text,
  source             text,
  order_number       text,
  order_total_usd    numeric,
  commission_percent numeric,
  amount_usd         numeric,
  payable            boolean,
  created_at         timestamptz,
  total_count        bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select e.id, e.entry_type, e.source, e.order_number, e.order_total_usd,
         e.commission_percent, e.amount_usd,
         (e.entry_type = 'earn'
          and o.payment_status = 'paid'
          and o.status in ('shipped', 'delivered')
          and o.refund_window_ends_at is not null
          and o.refund_window_ends_at <= now()
          and not exists (
            select 1 from public.associate_commission_entries x
            where x.order_id = e.order_id and x.source = e.source
              and x.entry_type = 'reversal')) as payable,
         e.created_at,
         count(*) over ()
  from public.associate_commission_entries e
  join public.orders o on o.id = e.order_id
  where public.current_stockist_id() is not null
    and e.stockist_id = public.current_stockist_id()
  order by e.created_at desc, e.id
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- 6b) My totals. Paying the ledger out is File 5, so 'payable' does not yet
--     subtract anything already paid.
create or replace function public.my_associate_commission_summary()
returns table (
  earned_usd   numeric,
  reversed_usd numeric,
  net_usd      numeric,
  payable_usd  numeric,
  pending_usd  numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with mine as (
    select e.*,
           exists (select 1 from public.associate_commission_entries x
                   where x.order_id = e.order_id and x.source = e.source
                     and x.entry_type = 'reversal') as is_reversed,
           (o.payment_status = 'paid'
            and o.status in ('shipped', 'delivered')
            and o.refund_window_ends_at is not null
            and o.refund_window_ends_at <= now()) as window_passed
    from public.associate_commission_entries e
    join public.orders o on o.id = e.order_id
    where public.current_stockist_id() is not null
      and e.stockist_id = public.current_stockist_id()
  )
  select
    coalesce(sum(amount_usd) filter (where entry_type = 'earn'), 0),
    coalesce(-sum(amount_usd) filter (where entry_type = 'reversal'), 0),
    coalesce(sum(amount_usd), 0),
    coalesce(sum(amount_usd) filter (where entry_type = 'earn' and not is_reversed and window_passed), 0),
    coalesce(sum(amount_usd) filter (where entry_type = 'earn' and not is_reversed and not window_passed), 0)
  from mine;
$$;


-- ────────────────────────────────────────────────────────────────────────
-- 7) Who may call what
-- ────────────────────────────────────────────────────────────────────────
revoke all on function public.backfill_associate_commissions(integer) from public, anon;
revoke all on function public.my_associate_commissions(integer, integer) from public, anon;
revoke all on function public.my_associate_commission_summary()         from public, anon;
grant execute on function public.backfill_associate_commissions(integer) to authenticated;
grant execute on function public.my_associate_commissions(integer, integer) to authenticated;
grant execute on function public.my_associate_commission_summary()         to authenticated;

commit;

notify pgrst, 'reload schema';


-- ════════════════════════════════════════════════════════════════════════
-- VERIFICATION (optional, run one at a time)
-- ════════════════════════════════════════════════════════════════════════

-- A) RLS on for both tables; ledger has only SELECT policies:
-- select tablename, rowsecurity from pg_tables
-- where schemaname = 'public'
--   and tablename in ('associate_commission_entries','associate_commission_settings');
-- select tablename, policyname, cmd from pg_policies
-- where tablename in ('associate_commission_entries','associate_commission_settings');

-- B) The two new triggers sit on orders beside your existing ones:
-- select tgname from pg_trigger
-- where tgrelid = 'public.orders'::regclass and not tgisinternal
--   and tgname like 'orders_associate_commission%';

-- C) The ledger really is append-only (should fail with the append-only message):
-- update public.associate_commission_entries set amount_usd = amount_usd;

-- D) Internal writers are NOT callable by app users (expect false, false):
-- select has_function_privilege('authenticated', 'public._record_associate_commission(uuid)', 'execute'),
--        has_function_privilege('anon',          'public._record_associate_commission(uuid)', 'execute');

-- E) After a test order is paid, its rows (admin / SQL editor):
-- select source, entry_type, order_number, order_total_usd,
--        commission_percent, amount_usd
-- from public.associate_commission_entries order by created_at desc limit 20;

-- NOTE: auth.uid() is empty in the SQL editor, so backfill and the my_*
-- functions cannot be tested there. Test them through the app on staging.