-- ════════════════════════════════════════════════════════════════════════
-- FINASTO — ASSOCIATE PROGRAM, STEP 5: associate payouts
-- Run AFTER associate-commissions.sql. Safe to re-run. ONE transaction.
--
-- Flow (same shape as your affiliate payouts)
--   1. Associate picks payable commission rows and requests a payout -> requested
--   2. Admin approves                                                -> approved
--        (or rejects with a reason -> rejected, rows become payable again)
--   3. Admin pays manually, uploads proof, enters the reference      -> paid
--
-- Rules
--   * Separate tables. Your affiliate payout tables and functions are not
--     touched.
--   * A commission row can sit in only ONE open request (unique index), and
--     only rows that are shipped/delivered, past the refund window and not
--     reversed are payable.
--   * A refund AFTER a payout was paid creates a negative adjustment that is
--     netted off the associate's next request (like payout_adjustments).
--   * A refund BEFORE payment blocks approval and payment: the admin must
--     reject the request, and the associate asks again.
--   * Bank details are shared with the associate's own affiliate account
--     (affiliate_bank_details), so there is one set of bank details.
--   * Nobody writes to these tables directly. SECURITY DEFINER functions do.
-- ════════════════════════════════════════════════════════════════════════

begin;

-- ────────────────────────────────────────────────────────────────────────
-- 0) Pre-flight checks
-- ────────────────────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('public.associate_commission_entries') is null then
    raise exception 'associate_commission_entries is missing. Run associate-commissions.sql first.';
  end if;
  if to_regclass('public.affiliate_bank_details') is null
     or to_regclass('public.order_settings') is null
     or to_regclass('public.currency_rates') is null then
    raise exception 'affiliate_bank_details, order_settings and currency_rates must exist.';
  end if;
  if to_regprocedure('public.is_admin()') is null
     or to_regprocedure('public.current_stockist_id()') is null
     or to_regprocedure('public.touch_updated_at()') is null then
    raise exception 'is_admin(), current_stockist_id() and touch_updated_at() must exist.';
  end if;
end $$;


-- ────────────────────────────────────────────────────────────────────────
-- 1) Tables
-- ────────────────────────────────────────────────────────────────────────
create table if not exists public.associate_payout_requests (
  id                  uuid primary key default gen_random_uuid(),
  request_number      text not null unique,
  stockist_id         uuid not null references public.stockists(id) on delete restrict,
  status              text not null default 'requested'
                        check (status in ('requested','approved','paid','rejected')),

  items_total_usd     numeric(12,2) not null check (items_total_usd >= 0),
  adjustments_usd     numeric(12,2) not null default 0 check (adjustments_usd <= 0),
  total_usd           numeric(12,2) not null check (total_usd > 0),

  -- Indicative amount in the associate's payout currency (fresh rate only).
  payout_currency     text not null check (payout_currency ~ '^[A-Z]{3}$'),
  fx_rate_to_usd      numeric check (fx_rate_to_usd is null or fx_rate_to_usd > 0),
  fx_rate_updated_at  timestamptz,
  total_payout_amount numeric(14,2) check (total_payout_amount is null or total_payout_amount >= 0),

  bank_snapshot       jsonb not null,

  requested_at        timestamptz not null default now(),
  approved_at         timestamptz,
  approved_by         uuid references auth.users(id) on delete set null,
  rejected_at         timestamptz,
  rejected_by         uuid references auth.users(id) on delete set null,
  rejection_reason    text check (rejection_reason is null or char_length(rejection_reason) <= 500),
  paid_at             timestamptz,
  paid_by             uuid references auth.users(id) on delete set null,
  payment_reference   text check (payment_reference is null or char_length(payment_reference) <= 100),
  payment_proof_path  text,
  paid_amount         numeric(14,2) check (paid_amount is null or paid_amount > 0),
  paid_currency       text check (paid_currency is null or paid_currency ~ '^[A-Z]{3}$'),

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint associate_payout_approved_fields
    check (status not in ('approved','paid') or approved_at is not null),
  constraint associate_payout_rejected_fields
    check (status <> 'rejected'
           or (rejected_at is not null
               and char_length(btrim(coalesce(rejection_reason, ''))) > 0)),
  constraint associate_payout_paid_fields
    check (status <> 'paid'
           or (paid_at is not null and payment_reference is not null
               and payment_proof_path is not null and paid_amount is not null
               and paid_currency is not null))
);

create index if not exists associate_payout_requests_stockist_idx
  on public.associate_payout_requests (stockist_id, created_at desc);
create index if not exists associate_payout_requests_status_idx
  on public.associate_payout_requests (status, created_at desc);

drop trigger if exists associate_payout_requests_touch_updated_at on public.associate_payout_requests;
create trigger associate_payout_requests_touch_updated_at
  before update on public.associate_payout_requests
  for each row execute function public.touch_updated_at();


create table if not exists public.associate_payout_items (
  id                uuid primary key default gen_random_uuid(),
  payout_request_id uuid not null references public.associate_payout_requests(id) on delete restrict,
  entry_id          uuid not null references public.associate_commission_entries(id) on delete restrict,
  order_number      text not null,
  order_total_usd   numeric(12,2) not null check (order_total_usd > 0),
  commission_percent numeric(5,2) not null
                      check (commission_percent > 0 and commission_percent <= 100),
  amount_usd        numeric(12,2) not null check (amount_usd > 0),
  -- Turned off when the request is rejected, which frees the row again.
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

-- A commission row can be in only ONE open request.
create unique index if not exists associate_payout_items_one_active_idx
  on public.associate_payout_items (entry_id) where is_active;
create index if not exists associate_payout_items_request_idx
  on public.associate_payout_items (payout_request_id);


create table if not exists public.associate_payout_adjustments (
  id                 uuid primary key default gen_random_uuid(),
  stockist_id        uuid not null references public.stockists(id) on delete restrict,
  entry_id           uuid not null unique
                       references public.associate_commission_entries(id) on delete restrict,
  amount_usd         numeric(12,2) not null check (amount_usd < 0),
  reason             text not null,
  applied_request_id uuid references public.associate_payout_requests(id) on delete restrict,
  created_at         timestamptz not null default now()
);

create index if not exists associate_payout_adjustments_open_idx
  on public.associate_payout_adjustments (stockist_id) where applied_request_id is null;


create table if not exists public.associate_payout_events (
  id                bigint generated always as identity primary key,
  payout_request_id uuid not null references public.associate_payout_requests(id) on delete restrict,
  event             text not null check (event in ('requested','approved','rejected','paid')),
  actor_id          uuid,
  actor_role        text,
  note              text,
  created_at        timestamptz not null default now()
);

create index if not exists associate_payout_events_request_idx
  on public.associate_payout_events (payout_request_id, created_at);


-- ────────────────────────────────────────────────────────────────────────
-- 2) Row Level Security: read only. Writes go through the functions below.
-- ────────────────────────────────────────────────────────────────────────
alter table public.associate_payout_requests    enable row level security;
alter table public.associate_payout_items       enable row level security;
alter table public.associate_payout_adjustments enable row level security;
alter table public.associate_payout_events      enable row level security;

drop policy if exists "admin reads associate payouts" on public.associate_payout_requests;
create policy "admin reads associate payouts"
  on public.associate_payout_requests for select using (public.is_admin());

drop policy if exists "associate reads own payouts" on public.associate_payout_requests;
create policy "associate reads own payouts"
  on public.associate_payout_requests for select
  using (stockist_id = public.current_stockist_id());

drop policy if exists "admin reads associate payout items" on public.associate_payout_items;
create policy "admin reads associate payout items"
  on public.associate_payout_items for select using (public.is_admin());

drop policy if exists "associate reads own payout items" on public.associate_payout_items;
create policy "associate reads own payout items"
  on public.associate_payout_items for select
  using (exists (
    select 1 from public.associate_payout_requests r
    where r.id = associate_payout_items.payout_request_id
      and r.stockist_id = public.current_stockist_id()));

drop policy if exists "admin reads associate adjustments" on public.associate_payout_adjustments;
create policy "admin reads associate adjustments"
  on public.associate_payout_adjustments for select using (public.is_admin());

drop policy if exists "associate reads own adjustments" on public.associate_payout_adjustments;
create policy "associate reads own adjustments"
  on public.associate_payout_adjustments for select
  using (stockist_id = public.current_stockist_id());

drop policy if exists "admin reads associate payout events" on public.associate_payout_events;
create policy "admin reads associate payout events"
  on public.associate_payout_events for select using (public.is_admin());


-- ────────────────────────────────────────────────────────────────────────
-- 3) Storage: private bucket for payout proofs
--    Path: <payout_request_id>/<file name>. Admin uploads and reads; the
--    associate can read only the proof of their own request.
-- ────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'associate-payout-proofs', 'associate-payout-proofs', false, 5242880,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin uploads associate payout proofs" on storage.objects;
create policy "admin uploads associate payout proofs"
  on storage.objects for insert
  with check (bucket_id = 'associate-payout-proofs' and public.is_admin());

drop policy if exists "admin reads associate payout proofs" on storage.objects;
create policy "admin reads associate payout proofs"
  on storage.objects for select
  using (bucket_id = 'associate-payout-proofs' and public.is_admin());

drop policy if exists "associate reads own payout proofs" on storage.objects;
create policy "associate reads own payout proofs"
  on storage.objects for select
  using (
    bucket_id = 'associate-payout-proofs'
    and exists (
      select 1 from public.associate_payout_requests r
      where r.id::text = (storage.foldername(name))[1]
        and r.stockist_id = public.current_stockist_id()));


-- ────────────────────────────────────────────────────────────────────────
-- 4) Refund AFTER a paid payout -> negative adjustment for the next request
-- ────────────────────────────────────────────────────────────────────────
create or replace function public.trg_associate_payout_adjustment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.associate_payout_adjustments
    (stockist_id, entry_id, amount_usd, reason)
  select new.stockist_id, new.id, new.amount_usd,
         'Order ' || new.order_number || ' was refunded after its commission was paid'
  from public.associate_payout_items i
  join public.associate_payout_requests r on r.id = i.payout_request_id
  where i.entry_id = new.reverses_entry_id
    and i.is_active
    and r.status = 'paid'
  on conflict (entry_id) do nothing;
  return new;
end;
$$;

revoke all on function public.trg_associate_payout_adjustment() from public, anon, authenticated;

drop trigger if exists associate_entries_payout_adjustment on public.associate_commission_entries;
create trigger associate_entries_payout_adjustment
  after insert on public.associate_commission_entries
  for each row
  when (new.entry_type = 'reversal')
  execute function public.trg_associate_payout_adjustment();


-- ────────────────────────────────────────────────────────────────────────
-- 5) Bank details (shared with the associate's own affiliate account)
-- ────────────────────────────────────────────────────────────────────────
create or replace function public.save_my_bank_details(
  p_account_holder_name    text,
  p_bank_name              text,
  p_bank_country           text,
  p_account_number_or_iban text,
  p_swift_bic              text,
  p_routing_code           text,
  p_payout_currency        text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_st  uuid := public.current_stockist_id();
  v_aff uuid;
begin
  if v_st is null then
    raise exception 'Not authorized';
  end if;

  select a.id into v_aff
  from public.affiliates a
  join public.stockists s on s.profile_id = a.profile_id
  where s.id = v_st and s.associate_package_id is not null
  limit 1;
  if v_aff is null then
    raise exception 'Your affiliate account was not found';
  end if;

  -- The table's own CHECK constraints validate formats and lengths.
  insert into public.affiliate_bank_details
    (affiliate_id, account_holder_name, bank_name, bank_country,
     account_number_or_iban, swift_bic, routing_code, payout_currency)
  values
    (v_aff, btrim(p_account_holder_name), btrim(p_bank_name), btrim(p_bank_country),
     btrim(p_account_number_or_iban),
     nullif(btrim(coalesce(p_swift_bic, '')), ''),
     nullif(btrim(coalesce(p_routing_code, '')), ''),
     upper(btrim(p_payout_currency)))
  on conflict (affiliate_id) do update
    set account_holder_name    = excluded.account_holder_name,
        bank_name              = excluded.bank_name,
        bank_country           = excluded.bank_country,
        account_number_or_iban = excluded.account_number_or_iban,
        swift_bic              = excluded.swift_bic,
        routing_code           = excluded.routing_code,
        payout_currency        = excluded.payout_currency;
end;
$$;

-- Masked view for the settings page (the full number is never sent back).
create or replace function public.my_associate_bank_details()
returns table (
  account_holder_name text,
  bank_name           text,
  bank_country        text,
  account_masked      text,
  swift_bic           text,
  routing_code        text,
  payout_currency     text
)
language sql
stable
security definer
set search_path = public
as $$
  select b.account_holder_name, b.bank_name, b.bank_country,
         repeat('•', 6) || right(b.account_number_or_iban, 4),
         b.swift_bic, b.routing_code, b.payout_currency
  from public.stockists s
  join public.affiliates a on a.profile_id = s.profile_id
  join public.affiliate_bank_details b on b.affiliate_id = a.id
  where public.current_stockist_id() is not null
    and s.id = public.current_stockist_id()
  limit 1;
$$;


-- ────────────────────────────────────────────────────────────────────────
-- 6) Payable commission rows (what the associate can put in a request)
-- ────────────────────────────────────────────────────────────────────────
create or replace function public.associate_payable_entries(p_stockist_id uuid)
returns table (
  entry_id             uuid,
  order_number         text,
  ordered_at           timestamptz,
  shipped_at           timestamptz,
  refund_window_ends_at timestamptz,
  order_total_usd      numeric,
  commission_percent   numeric,
  amount_usd           numeric,
  source               text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.is_admin() or p_stockist_id = public.current_stockist_id()) then
    raise exception 'Not authorized';
  end if;

  return query
  select e.id, e.order_number, o.created_at, o.shipped_at,
         o.refund_window_ends_at, e.order_total_usd, e.commission_percent,
         e.amount_usd, e.source
  from public.associate_commission_entries e
  join public.orders o on o.id = e.order_id
  where e.stockist_id = p_stockist_id
    and e.entry_type = 'earn'
    and o.payment_status = 'paid'
    and o.status in ('shipped', 'delivered')
    and o.refund_window_ends_at is not null
    and o.refund_window_ends_at <= now()
    and not exists (
      select 1 from public.associate_commission_entries x
      where x.order_id = e.order_id and x.source = e.source
        and x.entry_type = 'reversal')
    and not exists (
      select 1 from public.associate_payout_items i
      where i.entry_id = e.id and i.is_active)
  order by o.shipped_at, e.created_at;
end;
$$;


-- ────────────────────────────────────────────────────────────────────────
-- 7) ASSOCIATE: request a payout
-- ────────────────────────────────────────────────────────────────────────
create or replace function public.request_associate_payout(p_entry_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_st        uuid;
  v_status    text;
  v_profile   uuid;
  v_aff       uuid;
  v_ids       uuid[];
  v_bank      public.affiliate_bank_details%rowtype;
  v_count     integer;
  v_items     numeric(12,2);
  v_adj       numeric(12,2);
  v_total     numeric(12,2);
  v_min       numeric(10,2);
  v_currency  text;
  v_rate      numeric;
  v_rate_at   timestamptz;
  v_amount    numeric(14,2);
  v_id        uuid;
  v_number    text;
begin
  v_st := public.current_stockist_id();
  if v_st is null then
    raise exception 'Not authorized';
  end if;

  -- Lock my row: two clicks or two tabs run one after the other.
  select s.status, s.profile_id into v_status, v_profile
  from public.stockists s
  where s.id = v_st and s.associate_package_id is not null
  for update;
  if not found then
    raise exception 'Not authorized';
  end if;
  if v_status is distinct from 'active' then
    raise exception 'Your account is not active';
  end if;

  select array_agg(distinct x) into v_ids
  from unnest(coalesce(p_entry_ids, '{}'::uuid[])) as x;
  if v_ids is null or cardinality(v_ids) = 0 then
    raise exception 'Select at least one commission';
  end if;
  if cardinality(v_ids) > 200 then
    raise exception 'Select at most 200 commissions per request';
  end if;

  select a.id into v_aff from public.affiliates a where a.profile_id = v_profile limit 1;
  select * into v_bank from public.affiliate_bank_details where affiliate_id = v_aff;
  if not found then
    raise exception 'Add your bank details in Settings before requesting a payout';
  end if;

  -- Every selected row must be payable RIGHT NOW (re-checked here).
  select count(*), coalesce(sum(p.amount_usd), 0) into v_count, v_items
  from public.associate_payable_entries(v_st) p
  where p.entry_id = any (v_ids);
  if v_count <> cardinality(v_ids) then
    raise exception 'One or more selected commissions are not available for payout';
  end if;

  -- Refunds after an earlier paid payout are netted off.
  select coalesce(sum(adj.amount_usd), 0) into v_adj
  from public.associate_payout_adjustments adj
  where adj.stockist_id = v_st and adj.applied_request_id is null;

  v_total := v_items + v_adj;
  if v_total <= 0 then
    raise exception 'Your balance after refund adjustments is not positive yet';
  end if;

  select s.min_payout_usd into v_min from public.order_settings s where s.id;
  if v_total < coalesce(v_min, 0) then
    raise exception 'The minimum payout is % USD', v_min;
  end if;

  v_currency := upper(v_bank.payout_currency);
  if v_currency = 'USD' then
    v_rate := 1; v_rate_at := now(); v_amount := v_total;
  else
    select r.rate_to_base, r.updated_at into v_rate, v_rate_at
    from public.currency_rates r
    where r.currency_code = v_currency
      and r.updated_at > now() - interval '3 days';
    if v_rate is not null then
      v_amount := round(v_total / v_rate, 2);
    end if;
  end if;

  loop
    v_number := 'APAY-' || to_char(now() at time zone 'utc', 'YYYYMMDD') || '-'
                || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
    exit when not exists (
      select 1 from public.associate_payout_requests r where r.request_number = v_number);
  end loop;

  insert into public.associate_payout_requests (
    request_number, stockist_id, status,
    items_total_usd, adjustments_usd, total_usd,
    payout_currency, fx_rate_to_usd, fx_rate_updated_at, total_payout_amount,
    bank_snapshot
  ) values (
    v_number, v_st, 'requested',
    v_items, v_adj, v_total,
    v_currency, v_rate, v_rate_at, v_amount,
    jsonb_build_object(
      'account_holder_name',    v_bank.account_holder_name,
      'bank_name',              v_bank.bank_name,
      'bank_country',           v_bank.bank_country,
      'account_number_or_iban', v_bank.account_number_or_iban,
      'swift_bic',              v_bank.swift_bic,
      'routing_code',           v_bank.routing_code,
      'payout_currency',        v_currency)
  )
  returning id into v_id;

  insert into public.associate_payout_items
    (payout_request_id, entry_id, order_number, order_total_usd,
     commission_percent, amount_usd)
  select v_id, p.entry_id, p.order_number, p.order_total_usd,
         p.commission_percent, p.amount_usd
  from public.associate_payable_entries(v_st) p
  where p.entry_id = any (v_ids);

  update public.associate_payout_adjustments
  set applied_request_id = v_id
  where stockist_id = v_st and applied_request_id is null;

  insert into public.associate_payout_events (payout_request_id, event, actor_id, actor_role)
  values (v_id, 'requested', auth.uid(), 'associate');

  return v_id;

exception
  when unique_violation then
    raise exception 'One or more of these commissions is already in a payout request';
end;
$$;


-- ────────────────────────────────────────────────────────────────────────
-- 8) ADMIN: approve / reject / mark paid
-- ────────────────────────────────────────────────────────────────────────
create or replace function public.approve_associate_payout(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select status into v_status
  from public.associate_payout_requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found';
  end if;
  if v_status <> 'requested' then
    raise exception 'This request was already %', v_status;
  end if;

  if exists (
    select 1 from public.associate_payout_items i
    join public.associate_commission_entries rev on rev.reverses_entry_id = i.entry_id
    where i.payout_request_id = p_request_id and i.is_active
  ) then
    raise exception 'An order in this request was refunded. Reject the request and ask for a new one.';
  end if;

  update public.associate_payout_requests
  set status = 'approved', approved_at = now(), approved_by = auth.uid()
  where id = p_request_id;

  insert into public.associate_payout_events (payout_request_id, event, actor_id, actor_role)
  values (p_request_id, 'approved', auth.uid(), 'admin');
end;
$$;

create or replace function public.reject_associate_payout(
  p_request_id uuid,
  p_reason     text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) = 0 then
    raise exception 'Please add a short reason for the rejection';
  end if;
  if char_length(p_reason) > 500 then
    raise exception 'Reason is too long (500 characters at most)';
  end if;

  select status into v_status
  from public.associate_payout_requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found';
  end if;
  if v_status not in ('requested', 'approved') then
    raise exception 'This request was already %', v_status;
  end if;

  -- Free the commission rows and give the adjustments back.
  update public.associate_payout_items
  set is_active = false where payout_request_id = p_request_id;
  update public.associate_payout_adjustments
  set applied_request_id = null where applied_request_id = p_request_id;

  update public.associate_payout_requests
  set status = 'rejected', rejected_at = now(), rejected_by = auth.uid(),
      rejection_reason = btrim(p_reason)
  where id = p_request_id;

  insert into public.associate_payout_events (payout_request_id, event, actor_id, actor_role, note)
  values (p_request_id, 'rejected', auth.uid(), 'admin', btrim(p_reason));
end;
$$;

create or replace function public.mark_associate_payout_paid(
  p_request_id    uuid,
  p_reference     text,
  p_proof_path    text,
  p_paid_amount   numeric,
  p_paid_currency text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status   text;
  v_prefix   text;
  v_currency text := upper(btrim(coalesce(p_paid_currency, '')));
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  if char_length(btrim(coalesce(p_reference, ''))) = 0
     or char_length(p_reference) > 100 then
    raise exception 'Enter the payment reference (100 characters at most)';
  end if;
  if p_paid_amount is null or p_paid_amount <= 0 then
    raise exception 'Enter the amount you paid';
  end if;
  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'Enter a 3-letter currency code';
  end if;

  select status into v_status
  from public.associate_payout_requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found';
  end if;
  if v_status <> 'approved' then
    raise exception 'Only an approved request can be marked as paid';
  end if;

  if exists (
    select 1 from public.associate_payout_items i
    join public.associate_commission_entries rev on rev.reverses_entry_id = i.entry_id
    where i.payout_request_id = p_request_id and i.is_active
  ) then
    raise exception 'An order in this request was refunded. Reject the request and ask for a new one.';
  end if;

  v_prefix := p_request_id::text || '/';
  if p_proof_path is null
     or left(p_proof_path, char_length(v_prefix)) <> v_prefix
     or char_length(p_proof_path) > 300 then
    raise exception 'Invalid proof file';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'associate-payout-proofs' and name = p_proof_path
  ) then
    raise exception 'The proof file was not uploaded. Please try again.';
  end if;

  update public.associate_payout_requests
  set status = 'paid', paid_at = now(), paid_by = auth.uid(),
      payment_reference = btrim(p_reference),
      payment_proof_path = p_proof_path,
      paid_amount = round(p_paid_amount, 2),
      paid_currency = v_currency
  where id = p_request_id;

  insert into public.associate_payout_events (payout_request_id, event, actor_id, actor_role, note)
  values (p_request_id, 'paid', auth.uid(), 'admin', btrim(p_reference));
end;
$$;


-- ────────────────────────────────────────────────────────────────────────
-- 9) Associate reads
-- ────────────────────────────────────────────────────────────────────────
create or replace function public.my_associate_payouts(
  p_limit  integer default 20,
  p_offset integer default 0
)
returns table (
  id                  uuid,
  request_number      text,
  status              text,
  total_usd           numeric,
  total_payout_amount numeric,
  payout_currency     text,
  rejection_reason    text,
  payment_reference   text,
  requested_at        timestamptz,
  paid_at             timestamptz,
  total_count         bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.request_number, r.status, r.total_usd, r.total_payout_amount,
         r.payout_currency, r.rejection_reason, r.payment_reference,
         r.requested_at, r.paid_at, count(*) over ()
  from public.associate_payout_requests r
  where public.current_stockist_id() is not null
    and r.stockist_id = public.current_stockist_id()
  order by r.created_at desc, r.id
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- Same list and return type as File 4; 'payable' now also excludes rows that
-- are already in an open or paid request.
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
              and x.entry_type = 'reversal')
          and not exists (
            select 1 from public.associate_payout_items i
            where i.entry_id = e.id and i.is_active)) as payable,
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

-- The summary gains in_payout, paid and adjustments, so its return type
-- changes and it has to be dropped and recreated.
drop function if exists public.my_associate_commission_summary();

create function public.my_associate_commission_summary()
returns table (
  earned_usd      numeric,
  reversed_usd    numeric,
  net_usd         numeric,
  payable_usd     numeric,
  pending_usd     numeric,
  in_payout_usd   numeric,
  paid_usd        numeric,
  adjustments_usd numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with mine as (
    select e.entry_type, e.amount_usd,
           exists (select 1 from public.associate_commission_entries x
                   where x.order_id = e.order_id and x.source = e.source
                     and x.entry_type = 'reversal') as is_reversed,
           (o.payment_status = 'paid'
            and o.status in ('shipped', 'delivered')
            and o.refund_window_ends_at is not null
            and o.refund_window_ends_at <= now()) as window_passed,
           (select r.status
            from public.associate_payout_items i
            join public.associate_payout_requests r on r.id = i.payout_request_id
            where i.entry_id = e.id and i.is_active
            limit 1) as payout_status
    from public.associate_commission_entries e
    join public.orders o on o.id = e.order_id
    where public.current_stockist_id() is not null
      and e.stockist_id = public.current_stockist_id()
  )
  select
    coalesce(sum(amount_usd)  filter (where entry_type = 'earn'), 0),
    coalesce(-sum(amount_usd) filter (where entry_type = 'reversal'), 0),
    coalesce(sum(amount_usd), 0),
    coalesce(sum(amount_usd) filter (where entry_type = 'earn' and not is_reversed
                                       and window_passed and payout_status is null), 0),
    coalesce(sum(amount_usd) filter (where entry_type = 'earn' and not is_reversed
                                       and not window_passed and payout_status is null), 0),
    coalesce(sum(amount_usd) filter (where entry_type = 'earn' and not is_reversed
                                       and payout_status in ('requested', 'approved')), 0),
    coalesce(sum(amount_usd) filter (where entry_type = 'earn'
                                       and payout_status = 'paid'), 0),
    (select coalesce(sum(a.amount_usd), 0)
     from public.associate_payout_adjustments a
     where a.stockist_id = public.current_stockist_id()
       and a.applied_request_id is null)
  from mine;
$$;


-- ────────────────────────────────────────────────────────────────────────
-- 10) Who may call what. Admin functions re-check the role themselves.
-- ────────────────────────────────────────────────────────────────────────
revoke all on function public.save_my_bank_details(text, text, text, text, text, text, text) from public, anon;
revoke all on function public.my_associate_bank_details()                                 from public, anon;
revoke all on function public.associate_payable_entries(uuid)                             from public, anon;
revoke all on function public.request_associate_payout(uuid[])                            from public, anon;
revoke all on function public.approve_associate_payout(uuid)                              from public, anon;
revoke all on function public.reject_associate_payout(uuid, text)                         from public, anon;
revoke all on function public.mark_associate_payout_paid(uuid, text, text, numeric, text) from public, anon;
revoke all on function public.my_associate_payouts(integer, integer)                      from public, anon;
revoke all on function public.my_associate_commissions(integer, integer)                  from public, anon;
revoke all on function public.my_associate_commission_summary()                           from public, anon;

grant execute on function public.save_my_bank_details(text, text, text, text, text, text, text) to authenticated;
grant execute on function public.my_associate_bank_details()                                 to authenticated;
grant execute on function public.associate_payable_entries(uuid)                             to authenticated;
grant execute on function public.request_associate_payout(uuid[])                            to authenticated;
grant execute on function public.approve_associate_payout(uuid)                              to authenticated;
grant execute on function public.reject_associate_payout(uuid, text)                         to authenticated;
grant execute on function public.mark_associate_payout_paid(uuid, text, text, numeric, text) to authenticated;
grant execute on function public.my_associate_payouts(integer, integer)                      to authenticated;
grant execute on function public.my_associate_commissions(integer, integer)                  to authenticated;
grant execute on function public.my_associate_commission_summary()                           to authenticated;

commit;

notify pgrst, 'reload schema';


-- ════════════════════════════════════════════════════════════════════════
-- VERIFICATION (optional, run one at a time)
-- ════════════════════════════════════════════════════════════════════════

-- A) RLS on for all four tables; only SELECT policies exist:
-- select tablename, rowsecurity from pg_tables
-- where schemaname = 'public' and tablename like 'associate_payout_%';
-- select tablename, policyname, cmd from pg_policies
-- where tablename like 'associate_payout_%' order by tablename;

-- B) All functions exist and are SECURITY DEFINER (prosecdef = true):
-- select proname, prosecdef from pg_proc
-- where pronamespace = 'public'::regnamespace
--   and proname in ('save_my_bank_details','my_associate_bank_details',
--     'associate_payable_entries','request_associate_payout',
--     'approve_associate_payout','reject_associate_payout',
--     'mark_associate_payout_paid','my_associate_payouts',
--     'my_associate_commissions','my_associate_commission_summary')
-- order by proname;

-- C) The payout-proofs bucket is private (public should be false):
-- select id, public from storage.buckets where id = 'associate-payout-proofs';

-- D) The adjustment trigger sits on the ledger:
-- select tgname from pg_trigger
-- where tgrelid = 'public.associate_commission_entries'::regclass
--   and not tgisinternal;

-- NOTE: auth.uid() is empty in the SQL editor, so these functions cannot be
-- tested there. Test them through the app on staging.