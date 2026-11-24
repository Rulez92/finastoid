-- ════════════════════════════════════════════════════════════════════════
-- FINASTO — ASSOCIATE PROGRAM, STEP 6: role detection
-- Run LAST, only after Files 1-5 pass on staging. Safe to re-run.
-- ONE transaction.
--
-- Problem
--   is_stockist() and is_affiliate() read ONE role from the JWT, so a person
--   who is both an associate and an affiliate can only ever be one of them.
--
-- Change (additive: nobody who has access today can lose it)
--   is_stockist()  = JWT role is 'stockist'  OR  an ACTIVE stockists row is
--                    linked to the caller (stockists.profile_id = auth.uid())
--   is_affiliate() = JWT role is 'affiliate' OR  an ACTIVE affiliates row is
--                    linked to the caller (affiliates.profile_id = auth.uid())
--
-- Why SECURITY DEFINER
--   The RLS policies on stockists and affiliates call these helpers. If the
--   helper read those same tables as the caller, RLS would call the helper
--   again, forever. Running it as the owner avoids that. The function only
--   returns a boolean about the CALLER and takes no input, so it reveals
--   nothing about anyone else.
--
-- Safety
--   * profile_id is set only by admin-controlled functions, and the guard
--     triggers stop anyone from changing their own, so a row link cannot be
--     forged.
--   * Existing privileges on both functions are kept (CREATE OR REPLACE).
--   * Nothing else is changed: is_admin(), current_*_id(), every policy and
--     every function that calls these helpers stays exactly as it is.
--
-- ROLLBACK: the block at the bottom restores both original definitions.
-- ════════════════════════════════════════════════════════════════════════

begin;

do $$
begin
  if to_regprocedure('public.is_stockist()') is null
     or to_regprocedure('public.is_affiliate()') is null then
    raise exception 'is_stockist() and is_affiliate() must exist.';
  end if;
  if to_regclass('public.stockists') is null
     or to_regclass('public.affiliates') is null then
    raise exception 'stockists and affiliates must exist.';
  end if;
end $$;

create or replace function public.is_stockist()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'stockist'
      or exists (
           select 1 from public.stockists s
           where s.profile_id = auth.uid()
             and s.status = 'active'
         );
$$;

create or replace function public.is_affiliate()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'affiliate'
      or exists (
           select 1 from public.affiliates a
           where a.profile_id = auth.uid()
             and a.status = 'active'
         );
$$;

commit;

notify pgrst, 'reload schema';


-- ════════════════════════════════════════════════════════════════════════
-- BEFORE YOU RUN IT (optional but recommended): who gains a role?
-- Expect ONLY associates and their linked affiliates. Anyone else listed is a
-- data inconsistency you should look at first.
-- ════════════════════════════════════════════════════════════════════════
-- select 'stockist' as gains, u.email, u.raw_app_meta_data ->> 'role' as jwt_role
-- from public.stockists s join auth.users u on u.id = s.profile_id
-- where s.status = 'active'
--   and coalesce(u.raw_app_meta_data ->> 'role', '') <> 'stockist'
-- union all
-- select 'affiliate', u.email, u.raw_app_meta_data ->> 'role'
-- from public.affiliates a join auth.users u on u.id = a.profile_id
-- where a.status = 'active'
--   and coalesce(u.raw_app_meta_data ->> 'role', '') <> 'affiliate';

-- ════════════════════════════════════════════════════════════════════════
-- VERIFICATION (after running)
-- ════════════════════════════════════════════════════════════════════════
-- A) Both are SECURITY DEFINER with a fixed search_path:
-- select proname, prosecdef, proconfig from pg_proc
-- where pronamespace = 'public'::regnamespace
--   and proname in ('is_stockist', 'is_affiliate');

-- B) People who now hold both roles (dual-role associates):
-- select u.email
-- from public.stockists s
-- join public.affiliates a on a.profile_id = s.profile_id
-- join auth.users u on u.id = s.profile_id
-- where s.status = 'active' and a.status = 'active';

-- C) Staging test with three real logins (the SQL editor has no auth.uid()):
--    1. affiliate only  -> affiliate pages work, associate pages refuse
--    2. associate only  -> associate pages work
--    3. both            -> both dashboards work, and neither can read the
--                          other person's data (open another user's order
--                          or payout URL and confirm it returns nothing)

-- ════════════════════════════════════════════════════════════════════════
-- ROLLBACK (run this block alone if anything misbehaves): restores the
-- original JWT-only definitions exactly as they were.
-- ════════════════════════════════════════════════════════════════════════
-- begin;
-- create or replace function public.is_stockist()
--  returns boolean language sql stable
-- as $$
--   select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'stockist';
-- $$;
-- create or replace function public.is_affiliate()
--  returns boolean language sql stable
-- as $$
--   select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'affiliate';
-- $$;
-- commit;
-- notify pgrst, 'reload schema';