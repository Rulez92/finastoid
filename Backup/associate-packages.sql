-- ════════════════════════════════════════════════════════════════════════
-- FINASTO — ASSOCIATE PROGRAM, STEP 1: associate_packages
-- Admin-managed tiers (Mobile, Signature, ...). Run AFTER the stockist and
-- affiliate scripts. Safe to re-run. Runs as ONE transaction.
--
-- Rules
--   * Tiers are DATA, not code: the admin can change a price or rate, or add
--     a new tier, without a deploy.
--   * A package is never deleted, only set to 'inactive', so applications and
--     associates that point to it never dangle.
--   * Later steps COPY price and commission onto each application/associate
--     at submit/approval time, so changing a package here never alters
--     existing records.
--   * The public /apply page cannot read this table. It uses
--     list_public_packages(), which returns active packages only.
--   * Nothing here touches stockists, affiliates or any existing function.
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
end $$;


-- ────────────────────────────────────────────────────────────────────────
-- 1) associate_packages
-- ────────────────────────────────────────────────────────────────────────
create table if not exists public.associate_packages (
  id                 uuid primary key default gen_random_uuid(),

  -- Stable machine name used by code and URLs ('mobile', 'signature').
  -- Never shown as the title; never changed after creation.
  code               text not null unique
                       check (code ~ '^[a-z0-9][a-z0-9_-]{1,39}$'),

  name               text not null
                       check (char_length(btrim(name)) between 2 and 60),
  description        text
                       check (description is null or char_length(description) <= 500),

  -- One-time package fee and the commission earned on verified sales.
  price_usd          numeric(12,2) not null check (price_usd >= 0),
  commission_percent numeric(5,2)  not null
                       check (commission_percent >= 0 and commission_percent <= 100),

  -- Soft-delete model: 'inactive' hides it from /apply, row stays.
  status             text not null default 'active'
                       check (status in ('active', 'inactive')),

  -- Order shown on the apply form (lowest first).
  sort_order         integer not null default 0,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists associate_packages_status_sort_idx
  on public.associate_packages (status, sort_order);

drop trigger if exists associate_packages_touch_updated_at on public.associate_packages;
create trigger associate_packages_touch_updated_at
  before update on public.associate_packages
  for each row execute function public.touch_updated_at();


-- ────────────────────────────────────────────────────────────────────────
-- 2) Row Level Security
--    Admin: full access. Everyone else: no direct access at all.
-- ────────────────────────────────────────────────────────────────────────
alter table public.associate_packages enable row level security;

drop policy if exists "admin manages associate packages" on public.associate_packages;
create policy "admin manages associate packages"
  on public.associate_packages for all
  using (public.is_admin())
  with check (public.is_admin());


-- ────────────────────────────────────────────────────────────────────────
-- 3) Public read for the /apply page
--    Active packages only, and only the fields the form needs.
-- ────────────────────────────────────────────────────────────────────────
create or replace function public.list_public_packages()
returns table (
  code               text,
  name               text,
  description        text,
  price_usd          numeric,
  commission_percent numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select p.code, p.name, p.description, p.price_usd, p.commission_percent
  from public.associate_packages p
  where p.status = 'active'
  order by p.sort_order, p.price_usd;
$$;

revoke all on function public.list_public_packages() from public;
grant execute on function public.list_public_packages() to anon, authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 4) Starting tiers (from the program brochure). Existing rows are never
--    overwritten, so re-running this file cannot undo an admin's changes.
-- ────────────────────────────────────────────────────────────────────────
insert into public.associate_packages
  (code, name, description, price_usd, commission_percent, sort_order)
values
  ('mobile',    'Mobile Associate',    'Product purchasing package with 4% commission on verified sales.', 199, 4, 1),
  ('signature', 'Signature Associate', 'Product purchasing package with 7% commission on verified sales.', 499, 7, 2)
on conflict (code) do nothing;

commit;

notify pgrst, 'reload schema';


-- ════════════════════════════════════════════════════════════════════════
-- VERIFICATION (optional, run one at a time)
-- ════════════════════════════════════════════════════════════════════════

-- A) Two starting packages exist:
-- select code, name, price_usd, commission_percent, status
-- from public.associate_packages order by sort_order;

-- B) RLS is on, and only the admin policy exists:
-- select tablename, rowsecurity from pg_tables
-- where schemaname = 'public' and tablename = 'associate_packages';
-- select policyname, cmd from pg_policies
-- where tablename = 'associate_packages';

-- C) The public function returns only active packages:
-- select * from public.list_public_packages();