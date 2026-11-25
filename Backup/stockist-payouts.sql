-- ════════════════════════════════════════════════════════════════════════
-- STOCKIST PORTAL, STEP 2 (v2): bank details, profile photo, commission
-- ledger and payout requests.
-- Run AFTER: associate-tiers.sql and the affiliate payouts.sql.
-- Safe to re-run. Runs as ONE transaction: all of it applies, or none.
-- If an earlier version of this file was run, its (empty) tables are
-- replaced. If they already hold rows, this stops and tells you.
--
-- Same design as the affiliate payouts, so both flows behave alike:
--   1. When an order from an assigned affiliate becomes PAID (a verified
--      sale), a trigger writes ONE row into stockist_commissions. The
--      stockist's tier rate is copied onto that row at that moment and is
--      never recalculated, so a later tier change never rewrites history.
--   2. A sale is PAYABLE when the order is paid, shipped or delivered, its
--      refund window has ended, and it is not in a live payout request.
--      Shipped date and refund window are read LIVE from orders.
--   3. The stockist ticks payable sales and sends ONE request. The bank
--      details are copied onto the request.
--   4. Admin approves (or rejects with a reason, which releases the
--      sales), pays manually, then records payment, reference and proof.
--   5. A refund AFTER a payout was paid becomes a negative adjustment that
--      is netted off the next request. History is never edited.
--
-- Nobody writes the payout tables directly. Every change goes through the
-- functions below, which check the caller's role and the current state.
--
-- "Verified sale" here means: orders.payment_status becomes 'paid'.
-- ════════════════════════════════════════════════════════════════════════

begin;

-- ────────────────────────────────────────────────────────────────────────
-- 0) Pre-flight checks
-- ────────────────────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('public.stockists') is null then
    raise exception 'Table public.stockists is missing.';
  end if;
  if to_regclass('public.affiliates') is null then
    raise exception 'Table public.affiliates is missing.';
  end if;
  if to_regclass('public.associate_tiers') is null then
    raise exception 'Table public.associate_tiers is missing. Run associate-tiers.sql first.';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stockists' and column_name = 'tier_id'
  ) then
    raise exception 'stockists.tier_id is missing. Run associate-tiers.sql first.';
  end if;
  if to_regclass('public.orders') is null then
    raise exception 'Table public.orders is missing.';
  end if;
  if to_regclass('public.payout_requests') is null
     or not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'order_settings'
         and column_name = 'min_payout_usd'
     ) then
    raise exception 'The affiliate payouts.sql has not been run (order_settings.min_payout_usd is missing).';
  end if;
  if to_regclass('public.currency_rates') is null then
    raise exception 'Table public.currency_rates is missing.';
  end if;
  if to_regprocedure('public.is_admin()') is null then
    raise exception 'public.is_admin() is missing.';
  end if;
  if to_regprocedure('public.is_stockist()') is null then
    raise exception 'public.is_stockist() is missing.';
  end if;
  if to_regprocedure('public.touch_updated_at()') is null then
    raise exception 'public.touch_updated_at() is missing.';
  end if;
end $$;

-- The proof-reading storage policy depends on stockist_payout_requests, so
-- it must go BEFORE that table can be dropped. Section 5 recreates it.
drop policy if exists "stockist reads own payout proofs" on storage.objects;

-- Remove leftovers of the first version of this file (different shape).
-- Only dropped when empty, so real data is never lost.
do $$
begin
  if to_regclass('public.stockist_commissions') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'stockist_commissions'
         and column_name = 'kind'
     )
  then
    if exists (select 1 from public.stockist_commissions) then
      raise exception 'The old stockist_commissions table has rows. Not dropping it; send them to me first.';
    end if;
    drop table public.stockist_commissions;
  end if;

  if to_regclass('public.stockist_payout_requests') is not null
     and not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'stockist_payout_requests'
         and column_name = 'fx_rate_to_usd'
     )
  then
    if exists (select 1 from public.stockist_payout_requests) then
      raise exception 'The old stockist_payout_requests table has rows. Not dropping it; send them to me first.';
    end if;
    drop table public.stockist_payout_requests;
  end if;
end $$;

drop function if exists public.stockist_commission_is_payable(timestamptz, timestamptz);
drop function if exists public.stockist_earnings_summary();
drop function if exists public.stockist_payable_commissions();
drop function if exists public.record_stockist_commission(uuid, uuid, text, numeric, timestamptz, timestamptz, timestamptz);
drop function if exists public.reverse_stockist_commission(uuid, text);
drop function if exists public.admin_approve_stockist_payout(uuid);
drop function if exists public.admin_reject_stockist_payout(uuid, text);
drop function if exists public.admin_mark_stockist_payout_paid(uuid, numeric, text, text, text);

drop policy if exists "admin manages stockist payout proofs" on storage.objects;


-- ────────────────────────────────────────────────────────────────────────
-- 1) Helpers: the signed-in stockist's own id
--    SECURITY DEFINER because a stockist has no direct policy on stockists.
-- ────────────────────────────────────────────────────────────────────────
create or replace function public.my_stockist_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.id
  from public.stockists s
  where public.is_stockist()
    and s.profile_id = auth.uid()
  limit 1;
$$;

-- Same, but only while the account is active. Used for every write.
create or replace function public.my_active_stockist_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.id
  from public.stockists s
  where public.is_stockist()
    and s.profile_id = auth.uid()
    and s.status = 'active'
  limit 1;
$$;

revoke all on function public.my_stockist_id()        from public, anon;
revoke all on function public.my_active_stockist_id() from public, anon;
grant execute on function public.my_stockist_id()        to authenticated;
grant execute on function public.my_active_stockist_id() to authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 2) Profile photo
-- ────────────────────────────────────────────────────────────────────────
alter table public.stockists
  add column if not exists avatar_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'stockist-avatars', 'stockist-avatars', false, 2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- The first folder in the path must be the user's own id.
drop policy if exists "stockist avatars: own insert" on storage.objects;
create policy "stockist avatars: own insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'stockist-avatars'
    and public.is_stockist()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "stockist avatars: own select" on storage.objects;
create policy "stockist avatars: own select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'stockist-avatars'
    and public.is_stockist()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "stockist avatars: own update" on storage.objects;
create policy "stockist avatars: own update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'stockist-avatars'
    and public.is_stockist()
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'stockist-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "stockist avatars: own delete" on storage.objects;
create policy "stockist avatars: own delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'stockist-avatars'
    and public.is_stockist()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "stockist avatars: admin select" on storage.objects;
create policy "stockist avatars: admin select" on storage.objects
  for select to authenticated
  using (bucket_id = 'stockist-avatars' and public.is_admin());

-- Saves the new photo path and returns the OLD path, so the app can delete
-- the old file. A stockist has no direct UPDATE on stockists, so this is
-- the only way to change the photo.
create or replace function public.set_my_stockist_avatar(p_path text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id  uuid;
  v_old text;
begin
  v_id := public.my_active_stockist_id();
  if v_id is null then
    raise exception 'Your stockist account is not active';
  end if;

  if p_path is not null
     and not starts_with(p_path, auth.uid()::text || '/') then
    raise exception 'Invalid photo path';
  end if;

  select s.avatar_path into v_old from public.stockists s where s.id = v_id;
  update public.stockists set avatar_path = p_path where id = v_id;
  return v_old;
end;
$$;

revoke all on function public.set_my_stockist_avatar(text) from public, anon;
grant execute on function public.set_my_stockist_avatar(text) to authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3) Bank details (same fields and rules as the affiliate form)
-- ────────────────────────────────────────────────────────────────────────
create table if not exists public.stockist_bank_details (
  stockist_id            uuid primary key
                           references public.stockists (id) on delete restrict,
  account_holder_name    text not null check (char_length(btrim(account_holder_name)) between 1 and 120),
  bank_name              text not null check (char_length(btrim(bank_name)) between 1 and 120),
  bank_country           text not null check (char_length(btrim(bank_country)) between 1 and 60),
  account_number_or_iban text not null check (char_length(account_number_or_iban) between 4 and 60),
  swift_bic              text check (
                           swift_bic is null
                           or swift_bic ~ '^[A-Za-z0-9]{8}([A-Za-z0-9]{3})?$'
                         ),
  routing_code           text check (routing_code is null or char_length(routing_code) <= 30),
  payout_currency        text not null check (payout_currency ~ '^[A-Za-z]{3}$'),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

drop trigger if exists stockist_bank_details_touch on public.stockist_bank_details;
create trigger stockist_bank_details_touch
  before update on public.stockist_bank_details
  for each row execute function public.touch_updated_at();

drop function if exists public.touch_stockist_payout_updated_at();

alter table public.stockist_bank_details enable row level security;

drop policy if exists "stockist reads own bank details" on public.stockist_bank_details;
create policy "stockist reads own bank details"
  on public.stockist_bank_details
  for select to authenticated
  using (stockist_id = public.my_stockist_id());

drop policy if exists "stockist adds own bank details" on public.stockist_bank_details;
create policy "stockist adds own bank details"
  on public.stockist_bank_details
  for insert to authenticated
  with check (stockist_id = public.my_active_stockist_id());

drop policy if exists "stockist edits own bank details" on public.stockist_bank_details;
create policy "stockist edits own bank details"
  on public.stockist_bank_details
  for update to authenticated
  using (stockist_id = public.my_active_stockist_id())
  with check (stockist_id = public.my_active_stockist_id());

-- The admin reads them to pay. The admin never edits a stockist's bank.
drop policy if exists "admin reads stockist bank details" on public.stockist_bank_details;
create policy "admin reads stockist bank details"
  on public.stockist_bank_details
  for select to authenticated
  using (public.is_admin());


-- ────────────────────────────────────────────────────────────────────────
-- 4) Payout tables
-- ────────────────────────────────────────────────────────────────────────

-- 4a) Commission ledger: one row per verified sale, rate frozen.
create table if not exists public.stockist_commissions (
  id                 uuid primary key default gen_random_uuid(),
  stockist_id        uuid not null
                       references public.stockists (id) on delete restrict,
  affiliate_id       uuid not null
                       references public.affiliates (id) on delete restrict,
  order_id           uuid not null unique
                       references public.orders (id) on delete restrict,
  order_number       text not null,
  order_total_usd    numeric(12, 2) not null check (order_total_usd > 0),

  tier_name          text not null,                 -- frozen at verification
  commission_percent numeric(5, 2) not null         -- frozen at verification
                       check (commission_percent > 0 and commission_percent <= 100),
  commission_usd     numeric(12, 2) not null check (commission_usd >= 0),

  created_at         timestamptz not null default now()
);

create index if not exists stockist_commissions_stockist_idx
  on public.stockist_commissions (stockist_id, created_at desc);

-- 4b) Payout requests: requested -> approved -> paid, or rejected.
create table if not exists public.stockist_payout_requests (
  id                  uuid primary key default gen_random_uuid(),
  request_number      text not null unique,

  stockist_id         uuid not null
                        references public.stockists (id) on delete restrict,

  status              text not null default 'requested'
                        check (status in ('requested', 'approved', 'paid', 'rejected')),

  -- USD (the base currency). total = items + adjustments.
  items_total_usd     numeric(12, 2) not null check (items_total_usd >= 0),
  adjustments_usd     numeric(12, 2) not null default 0 check (adjustments_usd <= 0),
  total_usd           numeric(12, 2) not null check (total_usd > 0),

  -- Indicative amount in the stockist's payout currency, frozen at request
  -- time. Left empty when no FRESH rate exists.
  payout_currency     text not null check (payout_currency ~ '^[A-Z]{3}$'),
  fx_rate_to_usd      numeric check (fx_rate_to_usd is null or fx_rate_to_usd > 0),
  fx_rate_updated_at  timestamptz,
  total_payout_amount numeric(14, 2) check (total_payout_amount is null or total_payout_amount >= 0),

  -- Bank details copied at request time.
  bank_snapshot       jsonb not null,

  requested_at        timestamptz not null default now(),

  approved_at         timestamptz,
  approved_by         uuid references auth.users (id) on delete set null,

  rejected_at         timestamptz,
  rejected_by         uuid references auth.users (id) on delete set null,
  rejection_reason    text,

  paid_at             timestamptz,
  paid_by             uuid references auth.users (id) on delete set null,
  payment_reference   text,
  payment_proof_path  text,     -- inside payout-proofs, as stockist/<id>/<file>
  paid_amount         numeric(14, 2) check (paid_amount is null or paid_amount > 0),
  paid_currency       text check (paid_currency is null or paid_currency ~ '^[A-Z]{3}$'),

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint stockist_payout_approved_fields check (
    status not in ('approved', 'paid') or approved_at is not null
  ),
  constraint stockist_payout_rejected_fields check (
    status <> 'rejected' or (rejected_at is not null and rejection_reason is not null)
  ),
  constraint stockist_payout_paid_fields check (
    status <> 'paid' or (
      paid_at is not null
      and payment_reference is not null
      and payment_proof_path is not null
      and paid_amount is not null
      and paid_currency is not null
    )
  )
);

create index if not exists stockist_payout_requests_stockist_idx
  on public.stockist_payout_requests (stockist_id, created_at desc);
create index if not exists stockist_payout_requests_status_idx
  on public.stockist_payout_requests (status, created_at desc);

drop trigger if exists stockist_payout_requests_touch on public.stockist_payout_requests;
create trigger stockist_payout_requests_touch
  before update on public.stockist_payout_requests
  for each row execute function public.touch_updated_at();

-- 4c) One row per sale inside a request, commission frozen. is_active turns
--     false only when the request is rejected. The unique index guarantees a
--     sale can never be in two live requests, even with a double click.
create table if not exists public.stockist_payout_request_items (
  id                 uuid primary key default gen_random_uuid(),
  payout_request_id  uuid not null
                       references public.stockist_payout_requests (id) on delete restrict,
  commission_id      uuid not null
                       references public.stockist_commissions (id) on delete restrict,
  order_id           uuid not null
                       references public.orders (id) on delete restrict,

  order_number       text not null,
  order_total_usd    numeric(12, 2) not null check (order_total_usd > 0),
  commission_percent numeric(5, 2) not null
                       check (commission_percent > 0 and commission_percent <= 100),
  commission_usd     numeric(12, 2) not null check (commission_usd >= 0),

  is_active          boolean not null default true,
  created_at         timestamptz not null default now()
);

create index if not exists stockist_payout_items_request_idx
  on public.stockist_payout_request_items (payout_request_id);
create index if not exists stockist_payout_items_order_idx
  on public.stockist_payout_request_items (order_id);
create unique index if not exists stockist_payout_items_one_live_order
  on public.stockist_payout_request_items (order_id)
  where is_active;

-- 4d) Refund AFTER a payout was paid: one negative row, netted off the
--     next request. A rejected request gives its adjustments back.
create table if not exists public.stockist_payout_adjustments (
  id                 uuid primary key default gen_random_uuid(),
  stockist_id        uuid not null
                       references public.stockists (id) on delete restrict,
  order_id           uuid not null unique
                       references public.orders (id) on delete restrict,
  amount_usd         numeric(12, 2) not null check (amount_usd < 0),
  reason             text not null,
  applied_request_id uuid
                       references public.stockist_payout_requests (id) on delete restrict,
  created_at         timestamptz not null default now()
);

create index if not exists stockist_payout_adjustments_stockist_idx
  on public.stockist_payout_adjustments (stockist_id, applied_request_id);

-- 4e) Audit log, admin-readable only.
create table if not exists public.stockist_payout_events (
  id                bigint generated always as identity primary key,
  payout_request_id uuid not null
                      references public.stockist_payout_requests (id) on delete restrict,
  event             text not null
                      check (event in ('requested', 'approved', 'rejected', 'paid')),
  actor_id          uuid,
  actor_role        text,
  note              text,
  created_at        timestamptz not null default now()
);

create index if not exists stockist_payout_events_request_idx
  on public.stockist_payout_events (payout_request_id, created_at);


-- ────────────────────────────────────────────────────────────────────────
-- 5) Row Level Security. READ ONLY from the browser; every write goes
--    through the functions in sections 6 to 8.
-- ────────────────────────────────────────────────────────────────────────
alter table public.stockist_commissions         enable row level security;
alter table public.stockist_payout_requests     enable row level security;
alter table public.stockist_payout_request_items enable row level security;
alter table public.stockist_payout_adjustments  enable row level security;
alter table public.stockist_payout_events       enable row level security;

revoke insert, update, delete, truncate
  on public.stockist_commissions, public.stockist_payout_requests,
     public.stockist_payout_request_items, public.stockist_payout_adjustments,
     public.stockist_payout_events
  from anon, authenticated;

drop policy if exists "stockist reads own commissions" on public.stockist_commissions;
create policy "stockist reads own commissions"
  on public.stockist_commissions for select to authenticated
  using (stockist_id = public.my_stockist_id() or public.is_admin());

drop policy if exists "stockist reads own payout requests" on public.stockist_payout_requests;
create policy "stockist reads own payout requests"
  on public.stockist_payout_requests for select to authenticated
  using (stockist_id = public.my_stockist_id() or public.is_admin());

drop policy if exists "stockist reads own payout items" on public.stockist_payout_request_items;
create policy "stockist reads own payout items"
  on public.stockist_payout_request_items for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.stockist_payout_requests r
      where r.id = payout_request_id
        and r.stockist_id = public.my_stockist_id()
    )
  );

drop policy if exists "stockist reads own payout adjustments" on public.stockist_payout_adjustments;
create policy "stockist reads own payout adjustments"
  on public.stockist_payout_adjustments for select to authenticated
  using (stockist_id = public.my_stockist_id() or public.is_admin());

drop policy if exists "admin reads stockist payout events" on public.stockist_payout_events;
create policy "admin reads stockist payout events"
  on public.stockist_payout_events for select to authenticated
  using (public.is_admin());

-- Payment proofs for stockists live in the existing private payout-proofs
-- bucket (the affiliate payouts.sql already lets the admin manage it), at
--   stockist/<payout request id>/<file name>
-- A stockist can read ONLY the proofs of their own requests.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payout-proofs', 'payout-proofs', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "stockist reads own payout proofs" on storage.objects;
create policy "stockist reads own payout proofs" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payout-proofs'
    and public.is_stockist()
    and (storage.foldername(name))[1] = 'stockist'
    and (storage.foldername(name))[2] in (
      select r.id::text
      from public.stockist_payout_requests r
      where r.stockist_id = public.my_stockist_id()
    )
  );


-- ────────────────────────────────────────────────────────────────────────
-- 6) Recording a sale (called by a trigger on orders)
-- ────────────────────────────────────────────────────────────────────────

-- Internal. Copies the stockist's tier rate onto a ledger row. Returns the
-- ledger row id, or NULL when there is nothing to record: no affiliate, an
-- affiliate with no stockist (the company keeps that sale), an unpaid order,
-- or a tier with 0%. Safe to call twice for the same order.
create or replace function public.record_stockist_commission_for_order(p_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order    public.orders%rowtype;
  v_aff      uuid;
  v_stockist uuid;
  v_tier     public.associate_tiers%rowtype;
  v_id       uuid;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found or v_order.affiliate_id is null then
    return null;
  end if;
  if v_order.payment_status is distinct from 'paid' then
    return null;
  end if;
  if coalesce(v_order.total_base, 0) <= 0 then
    return null;
  end if;

  select a.id, a.stockist_id into v_aff, v_stockist
  from public.affiliates a
  where a.profile_id = v_order.affiliate_id;
  if v_stockist is null then
    return null;
  end if;

  select t.* into v_tier
  from public.stockists s
  join public.associate_tiers t on t.id = s.tier_id
  where s.id = v_stockist;
  if not found or v_tier.commission_percent <= 0 then
    return null;
  end if;

  insert into public.stockist_commissions (
    stockist_id, affiliate_id, order_id, order_number, order_total_usd,
    tier_name, commission_percent, commission_usd
  )
  values (
    v_stockist, v_aff, p_order_id, v_order.order_number, v_order.total_base,
    v_tier.name, v_tier.commission_percent,
    round(v_order.total_base * v_tier.commission_percent / 100, 2)
  )
  on conflict (order_id) do nothing
  returning id into v_id;

  if v_id is null then
    select c.id into v_id from public.stockist_commissions c where c.order_id = p_order_id;
  end if;
  return v_id;
end;
$$;

revoke all on function public.record_stockist_commission_for_order(uuid) from public, anon, authenticated;

-- Trigger function. A problem here must never break checkout, so it only
-- logs a warning. The admin can retry with backfill_stockist_commission().
create or replace function public.trg_record_stockist_commission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.record_stockist_commission_for_order(new.id);
  return new;
exception
  when others then
    raise warning 'stockist commission not recorded for order %: %', new.id, sqlerrm;
    return new;
end;
$$;

revoke all on function public.trg_record_stockist_commission() from public, anon, authenticated;

drop trigger if exists orders_stockist_commission_on_insert on public.orders;
create trigger orders_stockist_commission_on_insert
  after insert on public.orders
  for each row
  when (new.payment_status = 'paid' and new.affiliate_id is not null)
  execute function public.trg_record_stockist_commission();

drop trigger if exists orders_stockist_commission_on_paid on public.orders;
create trigger orders_stockist_commission_on_paid
  after update of payment_status on public.orders
  for each row
  when (new.payment_status = 'paid'
        and old.payment_status is distinct from 'paid'
        and new.affiliate_id is not null)
  execute function public.trg_record_stockist_commission();

-- Admin retry / backfill for one order.
create or replace function public.backfill_stockist_commission(p_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  return public.record_stockist_commission_for_order(p_order_id);
end;
$$;

revoke all on function public.backfill_stockist_commission(uuid) from public, anon;
grant execute on function public.backfill_stockist_commission(uuid) to authenticated;

-- Refund AFTER the payout was paid -> negative adjustment for next time.
-- (A refund while a request is still open is caught by approve / mark paid.)
create or replace function public.create_stockist_payout_adjustment_on_refund()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.stockist_payout_adjustments (stockist_id, order_id, amount_usd, reason)
  select r.stockist_id, new.id, -i.commission_usd,
         'Order ' || new.order_number || ' was refunded after its payout was paid'
  from public.stockist_payout_request_items i
  join public.stockist_payout_requests r on r.id = i.payout_request_id
  where i.order_id = new.id
    and i.is_active
    and r.status = 'paid'
    and i.commission_usd > 0
  on conflict (order_id) do nothing;

  return new;
end;
$$;

revoke all on function public.create_stockist_payout_adjustment_on_refund() from public, anon, authenticated;

drop trigger if exists orders_stockist_adjustment_on_refund on public.orders;
create trigger orders_stockist_adjustment_on_refund
  after update of payment_status on public.orders
  for each row
  when (new.payment_status = 'refunded'
        and old.payment_status is distinct from 'refunded')
  execute function public.create_stockist_payout_adjustment_on_refund();


-- ────────────────────────────────────────────────────────────────────────
-- 7) What the stockist sees: payable sales, totals, profile
-- ────────────────────────────────────────────────────────────────────────

-- The eligibility rule. Callable by the stockist (own sales) or an admin.
create or replace function public.stockist_payable_orders(p_stockist_id uuid)
returns table (
  order_id              uuid,
  order_number          text,
  ordered_at            timestamptz,
  shipped_at            timestamptz,
  refund_window_ends_at timestamptz,
  order_total_usd       numeric,
  commission_percent    numeric,
  commission_usd        numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.is_admin() or p_stockist_id = public.my_stockist_id()) then
    raise exception 'Not authorized';
  end if;

  return query
  select
    c.order_id,
    c.order_number,
    o.created_at,
    o.shipped_at,
    o.refund_window_ends_at,
    c.order_total_usd,
    c.commission_percent,
    c.commission_usd
  from public.stockist_commissions c
  join public.orders o on o.id = c.order_id
  where c.stockist_id = p_stockist_id
    and o.payment_status = 'paid'
    and o.status in ('shipped', 'delivered')
    and o.refund_window_ends_at is not null
    and o.refund_window_ends_at <= now()
    and c.commission_usd > 0
    and not exists (
      select 1 from public.stockist_payout_request_items i
      where i.order_id = c.order_id and i.is_active
    )
  order by o.shipped_at, o.created_at;
end;
$$;

-- Totals shown to the stockist and the admin. Calculated, never typed in.
create or replace function public.stockist_earnings_summary(p_stockist_id uuid)
returns table (
  pending_usd            numeric,
  available_usd          numeric,
  refund_adjustments_usd numeric,
  in_review_usd          numeric,
  paid_usd               numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_pending numeric;
  v_payable numeric;
  v_adjust  numeric;
  v_review  numeric;
  v_paid    numeric;
begin
  if not (public.is_admin() or p_stockist_id = public.my_stockist_id()) then
    raise exception 'Not authorized';
  end if;

  select coalesce(sum(c.commission_usd), 0) into v_pending
  from public.stockist_commissions c
  join public.orders o on o.id = c.order_id
  where c.stockist_id = p_stockist_id
    and o.payment_status = 'paid'
    and o.status <> 'cancelled'
    and c.commission_usd > 0
    and (o.refund_window_ends_at is null or o.refund_window_ends_at > now())
    and not exists (
      select 1 from public.stockist_payout_request_items i
      where i.order_id = c.order_id and i.is_active
    );

  select coalesce(sum(p.commission_usd), 0) into v_payable
  from public.stockist_payable_orders(p_stockist_id) p;

  select coalesce(sum(adj.amount_usd), 0) into v_adjust
  from public.stockist_payout_adjustments adj
  where adj.stockist_id = p_stockist_id and adj.applied_request_id is null;

  select coalesce(sum(r.total_usd), 0) into v_review
  from public.stockist_payout_requests r
  where r.stockist_id = p_stockist_id and r.status in ('requested', 'approved');

  select coalesce(sum(r.total_usd), 0) into v_paid
  from public.stockist_payout_requests r
  where r.stockist_id = p_stockist_id and r.status = 'paid';

  return query select v_pending, v_payable + v_adjust, v_adjust, v_review, v_paid;
end;
$$;

-- The minimum payout the admin set (0 = none), readable by any signed-in user.
create or replace function public.get_stockist_min_payout_usd()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select s.min_payout_usd from public.order_settings s where s.id limit 1), 0);
$$;

-- Profile. The return shape gained avatar_path, so drop and recreate.
-- Safe columns only: no notes, no profile_id, no tier_id.
drop function if exists public.my_stockist_profile();

create function public.my_stockist_profile()
returns table (
  id                 uuid,
  name               text,
  email              text,
  phone              text,
  country            text,
  region             text,
  status             text,
  tier_name          text,
  purchase_amount    numeric,
  commission_percent numeric,
  avatar_path        text
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.name, s.email, s.phone, s.country, s.region, s.status,
         t.name, t.purchase_amount, t.commission_percent, s.avatar_path
  from public.stockists s
  join public.associate_tiers t on t.id = s.tier_id
  where public.is_stockist()
    and s.profile_id = auth.uid()
  limit 1;
$$;


-- ────────────────────────────────────────────────────────────────────────
-- 8) Request, approve, reject, mark paid
-- ────────────────────────────────────────────────────────────────────────

-- The stockist sends one request for 1..200 sales. The browser sends ONLY
-- the order ids; everything else is checked again here.
create or replace function public.request_stockist_payout(p_order_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stockist       uuid;
  v_status         text;
  v_ids            uuid[];
  v_bank           public.stockist_bank_details%rowtype;
  v_eligible_count integer;
  v_items_total    numeric(12, 2);
  v_adjustments    numeric(12, 2);
  v_total          numeric(12, 2);
  v_min            numeric(10, 2);
  v_currency       text;
  v_rate           numeric;
  v_rate_at        timestamptz;
  v_payout_amount  numeric(14, 2);
  v_request_id     uuid;
  v_number         text;
begin
  v_stockist := public.my_stockist_id();
  if v_stockist is null then
    raise exception 'Not authorized';
  end if;

  -- Lock this stockist's row: two clicks or two tabs run one after the
  -- other, never at the same time.
  select s.status into v_status
  from public.stockists s
  where s.id = v_stockist
  for update;

  if v_status is distinct from 'active' then
    raise exception 'Your account is not active';
  end if;

  select array_agg(distinct x) into v_ids
  from unnest(coalesce(p_order_ids, '{}'::uuid[])) as x;

  if v_ids is null or cardinality(v_ids) = 0 then
    raise exception 'Select at least one order';
  end if;
  if cardinality(v_ids) > 200 then
    raise exception 'Select at most 200 orders per request';
  end if;

  select * into v_bank
  from public.stockist_bank_details
  where stockist_id = v_stockist;
  if not found then
    raise exception 'Add your bank details in Settings before requesting a payout';
  end if;

  -- Every selected sale must be payable RIGHT NOW (re-checked here).
  select count(*), coalesce(sum(p.commission_usd), 0)
    into v_eligible_count, v_items_total
  from public.stockist_payable_orders(v_stockist) p
  where p.order_id = any (v_ids);

  if v_eligible_count <> cardinality(v_ids) then
    raise exception 'One or more selected orders are not available for payout';
  end if;

  select coalesce(sum(adj.amount_usd), 0) into v_adjustments
  from public.stockist_payout_adjustments adj
  where adj.stockist_id = v_stockist and adj.applied_request_id is null;

  v_total := v_items_total + v_adjustments;

  if v_total <= 0 then
    raise exception 'Your balance after refund adjustments is not positive yet';
  end if;

  select s.min_payout_usd into v_min from public.order_settings s where s.id;
  if v_total < coalesce(v_min, 0) then
    raise exception 'The minimum payout is % USD', v_min;
  end if;

  -- Indicative amount in the payout currency. Only a FRESH rate is used.
  v_currency := upper(v_bank.payout_currency);
  if v_currency = 'USD' then
    v_rate := 1;
    v_rate_at := now();
    v_payout_amount := v_total;
  else
    select r.rate_to_base, r.updated_at into v_rate, v_rate_at
    from public.currency_rates r
    where r.currency_code = v_currency
      and r.updated_at > now() - interval '3 days';

    if v_rate is not null then
      v_payout_amount := round(v_total / v_rate, 2);
    end if;
  end if;

  loop
    v_number := 'SPAY-' || to_char(now() at time zone 'utc', 'YYYYMMDD') || '-'
                || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
    exit when not exists (
      select 1 from public.stockist_payout_requests r where r.request_number = v_number
    );
  end loop;

  insert into public.stockist_payout_requests (
    request_number, stockist_id, status,
    items_total_usd, adjustments_usd, total_usd,
    payout_currency, fx_rate_to_usd, fx_rate_updated_at, total_payout_amount,
    bank_snapshot
  ) values (
    v_number, v_stockist, 'requested',
    v_items_total, v_adjustments, v_total,
    v_currency, v_rate, v_rate_at, v_payout_amount,
    jsonb_build_object(
      'account_holder_name',    v_bank.account_holder_name,
      'bank_name',              v_bank.bank_name,
      'bank_country',           v_bank.bank_country,
      'account_number_or_iban', v_bank.account_number_or_iban,
      'swift_bic',              v_bank.swift_bic,
      'routing_code',           v_bank.routing_code,
      'payout_currency',        v_currency
    )
  )
  returning id into v_request_id;

  insert into public.stockist_payout_request_items (
    payout_request_id, commission_id, order_id, order_number,
    order_total_usd, commission_percent, commission_usd
  )
  select v_request_id, c.id, c.order_id, c.order_number,
         c.order_total_usd, c.commission_percent, c.commission_usd
  from public.stockist_commissions c
  where c.stockist_id = v_stockist
    and c.order_id = any (v_ids);

  update public.stockist_payout_adjustments
  set applied_request_id = v_request_id
  where stockist_id = v_stockist and applied_request_id is null;

  insert into public.stockist_payout_events (payout_request_id, event, actor_id, actor_role)
  values (v_request_id, 'requested', auth.uid(), 'stockist');

  return v_request_id;

exception
  when unique_violation then
    raise exception 'One or more of these orders is already in a payout request';
end;
$$;

-- Admin accepts the amount.
create or replace function public.approve_stockist_payout(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  perform 1 from public.stockist_payout_requests r
  where r.id = p_request_id for update;

  if exists (
    select 1
    from public.stockist_payout_request_items i
    join public.orders o on o.id = i.order_id
    where i.payout_request_id = p_request_id
      and i.is_active
      and o.payment_status <> 'paid'
  ) then
    raise exception 'An order in this request was refunded. Reject the request so the stockist can send a new one.';
  end if;

  update public.stockist_payout_requests
  set status = 'approved', approved_at = now(), approved_by = auth.uid()
  where id = p_request_id and status = 'requested';

  if not found then
    raise exception 'Request not found or already processed';
  end if;

  insert into public.stockist_payout_events (payout_request_id, event, actor_id, actor_role)
  values (p_request_id, 'approved', auth.uid(), 'admin');
end;
$$;

-- Admin declines, with a reason the stockist sees. The sales and any refund
-- adjustments are released so the stockist can request them again.
create or replace function public.reject_stockist_payout(p_request_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  if char_length(v_reason) < 3 then
    raise exception 'Please give the stockist a reason';
  end if;

  perform 1 from public.stockist_payout_requests r
  where r.id = p_request_id for update;

  update public.stockist_payout_requests
  set status = 'rejected', rejected_at = now(), rejected_by = auth.uid(),
      rejection_reason = v_reason
  where id = p_request_id and status in ('requested', 'approved');

  if not found then
    raise exception 'Request not found or already processed';
  end if;

  update public.stockist_payout_request_items
  set is_active = false
  where payout_request_id = p_request_id;

  update public.stockist_payout_adjustments
  set applied_request_id = null
  where applied_request_id = p_request_id;

  insert into public.stockist_payout_events (payout_request_id, event, actor_id, actor_role, note)
  values (p_request_id, 'rejected', auth.uid(), 'admin', v_reason);
end;
$$;

-- Admin records the manual payment. The proof file must already be uploaded
-- to payout-proofs at  stockist/<request id>/<file name>.
create or replace function public.mark_stockist_payout_paid(
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
  v_reference text := btrim(coalesce(p_reference, ''));
  v_currency  text := upper(btrim(coalesce(p_paid_currency, '')));
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  if v_reference = '' then
    raise exception 'Enter the payment reference';
  end if;
  if p_proof_path is null
     or not starts_with(p_proof_path, 'stockist/' || p_request_id::text || '/') then
    raise exception 'Upload the payment proof first';
  end if;
  if p_paid_amount is null or p_paid_amount <= 0 then
    raise exception 'Enter the amount you sent';
  end if;
  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'Enter a 3-letter currency code';
  end if;

  perform 1 from public.stockist_payout_requests r
  where r.id = p_request_id for update;

  if exists (
    select 1
    from public.stockist_payout_request_items i
    join public.orders o on o.id = i.order_id
    where i.payout_request_id = p_request_id
      and i.is_active
      and o.payment_status <> 'paid'
  ) then
    raise exception 'An order in this request was refunded. Reject the request so the stockist can send a new one.';
  end if;

  update public.stockist_payout_requests
  set status = 'paid', paid_at = now(), paid_by = auth.uid(),
      payment_reference = v_reference, payment_proof_path = p_proof_path,
      paid_amount = p_paid_amount, paid_currency = v_currency
  where id = p_request_id and status = 'approved';

  if not found then
    raise exception 'Request not found, or it has not been approved yet';
  end if;

  insert into public.stockist_payout_events (payout_request_id, event, actor_id, actor_role, note)
  values (p_request_id, 'paid', auth.uid(), 'admin', v_reference);
end;
$$;


-- ────────────────────────────────────────────────────────────────────────
-- 9) Grants. Every function checks who is calling inside its own body.
-- ────────────────────────────────────────────────────────────────────────
revoke all on function public.my_stockist_profile()                     from public, anon;
revoke all on function public.stockist_payable_orders(uuid)             from public, anon;
revoke all on function public.stockist_earnings_summary(uuid)           from public, anon;
revoke all on function public.get_stockist_min_payout_usd()             from public, anon;
revoke all on function public.request_stockist_payout(uuid[])           from public, anon;
revoke all on function public.approve_stockist_payout(uuid)             from public, anon;
revoke all on function public.reject_stockist_payout(uuid, text)        from public, anon;
revoke all on function public.mark_stockist_payout_paid(uuid, text, text, numeric, text) from public, anon;

grant execute on function public.my_stockist_profile()                  to authenticated;
grant execute on function public.stockist_payable_orders(uuid)          to authenticated;
grant execute on function public.stockist_earnings_summary(uuid)        to authenticated;
grant execute on function public.get_stockist_min_payout_usd()          to authenticated;
grant execute on function public.request_stockist_payout(uuid[])        to authenticated;
grant execute on function public.approve_stockist_payout(uuid)          to authenticated;
grant execute on function public.reject_stockist_payout(uuid, text)     to authenticated;
grant execute on function public.mark_stockist_payout_paid(uuid, text, text, numeric, text) to authenticated;

commit;

notify pgrst, 'reload schema';


-- ════════════════════════════════════════════════════════════════════════
-- VERIFICATION (optional, run one at a time)
-- ════════════════════════════════════════════════════════════════════════

-- A) New tables exist with row level security on:
-- select tablename, rowsecurity from pg_tables
-- where tablename like 'stockist_%' order by tablename;

-- B) All functions exist:
-- select proname, prosecdef from pg_proc where proname in (
--   'my_stockist_profile', 'stockist_payable_orders', 'stockist_earnings_summary',
--   'get_stockist_min_payout_usd', 'request_stockist_payout',
--   'approve_stockist_payout', 'reject_stockist_payout',
--   'mark_stockist_payout_paid', 'set_my_stockist_avatar',
--   'record_stockist_commission_for_order', 'backfill_stockist_commission');

-- C) The three triggers on orders exist:
-- select tgname from pg_trigger
-- where tgrelid = 'public.orders'::regclass and tgname like 'orders_stockist_%';

-- D) Ledger fills as paid orders from assigned affiliates come in:
-- select order_number, tier_name, commission_percent, commission_usd
-- from public.stockist_commissions order by created_at desc limit 20;

-- OPTIONAL BACKFILL of orders that were already paid before this ran.
-- NOTE: it uses each stockist's CURRENT tier rate for those old orders.
-- select public.record_stockist_commission_for_order(o.id)
-- from public.orders o
-- where o.payment_status = 'paid' and o.affiliate_id is not null;

-- NOTE: auth.uid() is empty in the SQL editor, so the stockist-facing
-- functions cannot be tested here. Test them through the portal pages.