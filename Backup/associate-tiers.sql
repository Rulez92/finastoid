-- ════════════════════════════════════════════════════════════════════════
-- ASSOCIATE TIERS, STEP 1: tiers as data (replaces default_profit_percent)
-- Run AFTER stockists.sql and the "STOCKIST PORTAL, STEP 1" file.
-- Safe to re-run. Runs as ONE transaction (all or nothing).
--
-- What this does
--   1. Creates public.associate_tiers (admin-managed: name, purchase
--      amount, commission %, status). Tiers are archived, never deleted
--      once used.
--   2. Adds stockists.tier_id (FK, on delete restrict) and backfills every
--      existing stockist to the lowest tier so nobody is left without one.
--   3. Drops stockists.default_profit_percent. The tier alone now decides
--      what an associate earns.
--   4. Updates the column guard so non-admins cannot change tier_id.
--   5. Replaces my_stockist_profile() so the stockist sees their own tier
--      (read-only) instead of discount_percent.
--
-- History rule (enforced later, in the orders migration): each order_item
-- stores its own snapshot of the commission % and amount at the moment the
-- sale is verified. Never calculate old earnings from a tier's current rate.
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
  if to_regprocedure('public.is_admin()') is null then
    raise exception 'public.is_admin() is missing.';
  end if;
  if to_regprocedure('public.is_stockist()') is null then
    raise exception 'public.is_stockist() is missing.';
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgname = 'stockists_protect_admin_fields'
      and tgrelid = 'public.stockists'::regclass
  ) then
    raise exception 'Trigger stockists_protect_admin_fields is missing. Run the STOCKIST PORTAL STEP 1 file first.';
  end if;
end $$;


-- ────────────────────────────────────────────────────────────────────────
-- 1) associate_tiers table
-- ────────────────────────────────────────────────────────────────────────
create table if not exists public.associate_tiers (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  purchase_amount    numeric(12, 2) not null check (purchase_amount >= 0),
  commission_percent numeric(5, 2)  not null check (commission_percent between 0 and 100),
  sort_order         integer not null default 0,
  status             text not null default 'active'
                       check (status in ('active', 'archived')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint associate_tiers_name_not_blank check (char_length(btrim(name)) between 1 and 80)
);

-- Names are unique ignoring case and surrounding spaces.
create unique index if not exists associate_tiers_name_unique
  on public.associate_tiers (lower(btrim(name)));

create index if not exists associate_tiers_status_sort_idx
  on public.associate_tiers (status, sort_order);

-- Keep updated_at honest without relying on the app to send it.
create or replace function public.touch_associate_tiers_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists associate_tiers_touch_updated_at on public.associate_tiers;
create trigger associate_tiers_touch_updated_at
  before update on public.associate_tiers
  for each row execute function public.touch_associate_tiers_updated_at();


-- ────────────────────────────────────────────────────────────────────────
-- 2) Row Level Security: admin only. A stockist never reads this table
--    directly; they get their own tier through my_stockist_profile().
-- ────────────────────────────────────────────────────────────────────────
alter table public.associate_tiers enable row level security;

drop policy if exists "admin manages associate tiers" on public.associate_tiers;
create policy "admin manages associate tiers"
  on public.associate_tiers
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ────────────────────────────────────────────────────────────────────────
-- 3) Seed the two launch tiers (only if no tier with that name exists)
-- ────────────────────────────────────────────────────────────────────────
insert into public.associate_tiers (name, purchase_amount, commission_percent, sort_order)
select 'Mobile Associate', 199, 4, 1
where not exists (
  select 1 from public.associate_tiers where lower(btrim(name)) = 'mobile associate'
);

insert into public.associate_tiers (name, purchase_amount, commission_percent, sort_order)
select 'Signature Associate', 499, 7, 2
where not exists (
  select 1 from public.associate_tiers where lower(btrim(name)) = 'signature associate'
);


-- ────────────────────────────────────────────────────────────────────────
-- 4) stockists.tier_id
--    on delete restrict: a tier that any stockist uses can never be hard
--    deleted. Archive it instead.
-- ────────────────────────────────────────────────────────────────────────
alter table public.stockists
  add column if not exists tier_id uuid
  references public.associate_tiers (id) on delete restrict;

create index if not exists stockists_tier_id_idx
  on public.stockists (tier_id);


-- ────────────────────────────────────────────────────────────────────────
-- 5) Replace the column guard BEFORE touching default_profit_percent.
--    The old version reads new.default_profit_percent, so once that column
--    is dropped it would fail on every non-admin update.
-- ────────────────────────────────────────────────────────────────────────
create or replace function public.protect_stockist_admin_fields()
returns trigger
language plpgsql
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.status     is distinct from old.status
     or new.tier_id    is distinct from old.tier_id
     or new.email      is distinct from old.email
     or new.profile_id is distinct from old.profile_id
     or new.notes      is distinct from old.notes
  then
    raise exception 'Only an admin can change stockist status, tier, email, notes or login link';
  end if;

  return new;
end;
$$;


-- ────────────────────────────────────────────────────────────────────────
-- 6) Backfill: every stockist without a tier gets the lowest active tier.
--    The guard trigger is switched off for this one statement, because the
--    SQL editor is not an admin session and the guard would block it.
-- ────────────────────────────────────────────────────────────────────────
alter table public.stockists disable trigger stockists_protect_admin_fields;

update public.stockists
set tier_id = (
  select t.id
  from public.associate_tiers t
  where t.status = 'active'
  order by t.sort_order, t.created_at
  limit 1
)
where tier_id is null;

alter table public.stockists enable trigger stockists_protect_admin_fields;

-- Every stockist now has a tier, so make it mandatory.
alter table public.stockists
  alter column tier_id set not null;


-- ────────────────────────────────────────────────────────────────────────
-- 7) Drop the old profit column. The tier decides commission from now on.
-- ────────────────────────────────────────────────────────────────────────
alter table public.stockists
  drop column if exists default_profit_percent;


-- ────────────────────────────────────────────────────────────────────────
-- 8) my_stockist_profile(): the return shape changes, so the old function
--    must be dropped first (CREATE OR REPLACE cannot change a return type).
--    Safe columns only: no notes, no profile_id, no tier_id.
-- ────────────────────────────────────────────────────────────────────────
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
  commission_percent numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.name, s.email, s.phone, s.country, s.region, s.status,
         t.name, t.purchase_amount, t.commission_percent
  from public.stockists s
  join public.associate_tiers t on t.id = s.tier_id
  where public.is_stockist()
    and s.profile_id = auth.uid()
  limit 1;
$$;

revoke all on function public.my_stockist_profile() from public, anon;
grant execute on function public.my_stockist_profile() to authenticated;

commit;

notify pgrst, 'reload schema';


-- ════════════════════════════════════════════════════════════════════════
-- VERIFICATION (optional, run one at a time)
-- ════════════════════════════════════════════════════════════════════════

-- A) Two seeded tiers exist:
-- select name, purchase_amount, commission_percent, status
-- from public.associate_tiers order by sort_order;

-- B) No stockist is left without a tier (should return 0):
-- select count(*) from public.stockists where tier_id is null;

-- C) Old column is gone (should return 0 rows):
-- select column_name from information_schema.columns
-- where table_name = 'stockists' and column_name = 'default_profit_percent';

-- D) Only the admin policy exists on tiers:
-- select policyname, cmd from pg_policies where tablename = 'associate_tiers';

-- E) A used tier cannot be hard deleted (should fail with a foreign key
--    error). Replace the name if you renamed it:
-- delete from public.associate_tiers where name = 'Mobile Associate';

-- NOTE: auth.uid() is empty in the SQL editor, so my_stockist_profile()
-- cannot be tested here. Test it through the stockist Settings page.