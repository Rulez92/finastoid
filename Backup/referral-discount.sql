-- ════════════════════════════════════════════════════════════════
-- MIGRATION: referral discount (one percentage per affiliate)
-- Run AFTER affiliates.sql, the tier migration and referrals.sql.
-- The discount is taken from company margin. The affiliate's tier
-- commission is not changed here.
-- ════════════════════════════════════════════════════════════════

begin;

-- ── 1) Discount percent per affiliate (admin-set) ───────────────
alter table public.affiliates
  add column if not exists referral_discount_percent numeric(5,2) not null default 0;

alter table public.affiliates
  drop constraint if exists affiliates_referral_discount_range;
alter table public.affiliates
  add constraint affiliates_referral_discount_range
  check (referral_discount_percent >= 0 and referral_discount_percent <= 30);
-- Hard ceiling of 30% protects your margin even if the app has a bug.
-- To allow more later, change the 30 here in a new migration.

-- ── 2) Snapshot columns on orders ───────────────────────────────
-- subtotal_amount : product subtotal BEFORE discount, in order_currency
-- discount_amount : money taken off, in order_currency
-- total_amount    : (already exists) what the customer pays
alter table public.orders
  add column if not exists subtotal_amount            numeric(14,2),
  add column if not exists referral_discount_percent  numeric(5,2),
  add column if not exists discount_amount            numeric(14,2) not null default 0;

alter table public.orders
  drop constraint if exists orders_discount_sane;
alter table public.orders
  add constraint orders_discount_sane
  check (
    discount_amount >= 0
    and (referral_discount_percent is null
         or (referral_discount_percent >= 0 and referral_discount_percent <= 30))
  );

-- ── 3) Column guard (full, current version) ─────────────────────
-- Replaces the guard function. It now protects EVERY admin-only column:
-- status, stockist, email, login link, notes, commission override,
-- referral code and discount. It also restores the one-time lock on
-- name / phone / country (see the warning below).
create or replace function public.protect_affiliate_admin_fields()
returns trigger
language plpgsql
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.status                      is distinct from old.status
     or new.stockist_id                 is distinct from old.stockist_id
     or new.email                       is distinct from old.email
     or new.profile_id                  is distinct from old.profile_id
     or new.notes                       is distinct from old.notes
     or new.commission_override_percent is distinct from old.commission_override_percent
     or new.referral_code               is distinct from old.referral_code
     or new.referral_discount_percent   is distinct from old.referral_discount_percent
  then
    raise exception 'Only an admin can change affiliate status, stockist, email, notes, commission, referral code or discount';
  end if;

  if coalesce(current_setting('app.affiliate_profile_lock', true), '') <> 'on'
     and (
       new.name              is distinct from old.name
       or new.phone             is distinct from old.phone
       or new.country           is distinct from old.country
       or new.country_code      is distinct from old.country_code
       or new.display_currency  is distinct from old.display_currency
       or new.profile_locked_at is distinct from old.profile_locked_at
     )
  then
    raise exception 'name, phone and country are set once and locked. Contact support to change them';
  end if;

  return new;
end;
$$;

-- ── 4) Checkout attribution now also returns the discount ───────
-- The return type changes, so the old function must be dropped first.
drop function if exists public.resolve_referral_attribution(text);

create function public.resolve_referral_attribution(p_code text)
returns table (
  affiliate_id uuid,
  affiliate_profile_id uuid,
  affiliate_name text,
  commission_percent numeric,
  stockist_id uuid,
  stockist_profile_id uuid,
  stockist_profit_percent numeric,
  referral_discount_percent numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.profile_id,
    a.name,
    coalesce(a.commission_override_percent, public.commission_percent_for_sales(0)),
    s.id,
    s.profile_id,
    s.default_profit_percent,
    a.referral_discount_percent
  from public.affiliates a
  left join public.stockists s
    on s.id = a.stockist_id and s.status = 'active'
  where a.referral_code = upper(trim(p_code))
    and a.status = 'active'
    and a.profile_id is not null
  limit 1;
$$;

revoke all on function public.resolve_referral_attribution(text) from public;
grant execute on function public.resolve_referral_attribution(text) to anon, authenticated;

commit;

-- Quick checks:
--   select name, referral_code, referral_discount_percent from public.affiliates;
--   select * from public.resolve_referral_attribution('YOURCODE');
--   update public.affiliates set referral_discount_percent = 10 where referral_code = 'YOURCODE';