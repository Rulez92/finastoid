-- ════════════════════════════════════════════════════════════════════════
-- FINASTO — ASSOCIATE PROGRAM, STEP 2: associate_applications
-- Public application + manual payment flow. Run AFTER associate-packages.sql.
-- Safe to re-run. Runs as ONE transaction.
--
-- Flow (same shape as bulk orders)
--   1. Applicant submits on /apply (no login)                -> requested
--      Package, price and commission % are COPIED onto the application, so a
--      later package change never alters what the applicant was quoted.
--      The applicant gets a private tracking token (shown once).
--   2. Admin verifies and sends bank details                 -> awaiting_payment
--        (or rejects with a reason                          -> rejected)
--   3. Applicant pays manually and uploads proof             -> payment_submitted
--        (applicant can cancel only while still 'requested')
--   4. Admin checks the proof:
--        return  -> awaiting_payment  (proof unclear, asks for a new one)
--        cancel  -> cancelled
--        approve -> approved          (File 3: creates the associate + affiliate)
--
-- Security model
--   * Nobody writes to these tables directly, not even an admin. Every change
--     goes through a SECURITY DEFINER function that checks who is calling and
--     that the application is in the right state.
--   * Applicants have no login. They act through a tracking token. Only its
--     SHA-256 hash is stored, so a database leak does not leak working links.
--   * Proofs live in a PRIVATE bucket. There is NO storage policy for
--     applicants: the server action uploads the file after checking the token
--     and the file's real type, then calls submit_application_payment_proof().
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
  if to_regclass('public.associate_packages') is null then
    raise exception 'associate_packages is missing. Run associate-packages.sql first.';
  end if;
  if to_regclass('public.stockists') is null
     or to_regclass('public.affiliates') is null then
    raise exception 'stockists and affiliates must exist first.';
  end if;
end $$;


-- ────────────────────────────────────────────────────────────────────────
-- 1) associate_applications
-- ────────────────────────────────────────────────────────────────────────
create table if not exists public.associate_applications (
  id                  uuid primary key default gen_random_uuid(),
  number              bigint generated always as identity,   -- shown as AP-000123

  -- SHA-256 (hex) of the applicant's private tracking token.
  tracking_token_hash text not null unique,

  -- Package, price and rate COPIED at submit time. Never recalculated.
  package_id          uuid not null references public.associate_packages(id) on delete restrict,
  package_code        text not null,
  package_name        text not null,
  price_usd           numeric(12,2) not null check (price_usd >= 0),
  commission_percent  numeric(5,2)  not null
                        check (commission_percent >= 0 and commission_percent <= 100),

  -- What the applicant typed.
  applicant_name      text not null
                        check (char_length(btrim(applicant_name)) between 2 and 100),
  applicant_email     text not null
                        check (applicant_email = lower(btrim(applicant_email))
                               and char_length(applicant_email) between 3 and 254
                               and position('@' in applicant_email) > 1),
  applicant_phone     text
                        check (applicant_phone is null
                               or char_length(applicant_phone) between 7 and 30),
  applicant_country   text
                        check (applicant_country is null or char_length(applicant_country) <= 60),
  applicant_note      text
                        check (applicant_note is null or char_length(applicant_note) <= 500),

  -- Where the link was shared, e.g. /apply?ref=whatsapp. Reporting only.
  source              text
                        check (source is null or source ~ '^[a-z0-9_-]{1,40}$'),

  status              text not null default 'requested'
                        check (status in ('requested','awaiting_payment',
                                          'payment_submitted','approved',
                                          'rejected','cancelled')),

  -- The admin's latest message to the applicant (rejection or "send a
  -- clearer proof"). The applicant can read it on the tracking page.
  admin_note          text check (admin_note is null or char_length(admin_note) <= 500),

  -- Payment instructions typed by the admin. Free text on purpose: bank
  -- formats differ by country.
  bank_details        text check (bank_details is null or char_length(bank_details) <= 2000),

  -- Proof of payment (path in the private bucket) and the transfer reference.
  proof_path          text,
  payment_reference   text check (payment_reference is null or char_length(payment_reference) <= 100),

  -- Filled by approve_associate_application() in File 3.
  stockist_id         uuid references public.stockists(id)  on delete set null,
  affiliate_id        uuid references public.affiliates(id) on delete set null,

  quoted_at           timestamptz,
  proof_submitted_at  timestamptz,
  decided_at          timestamptz,   -- approved / rejected / cancelled
  reviewed_by         uuid references auth.users(id) on delete set null,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint associate_applications_reject_needs_note
    check (status <> 'rejected' or char_length(btrim(coalesce(admin_note, ''))) > 0),
  constraint associate_applications_payment_needs_bank
    check (status not in ('awaiting_payment','payment_submitted','approved')
           or char_length(btrim(coalesce(bank_details, ''))) > 0)
);

create unique index if not exists associate_applications_number_key
  on public.associate_applications (number);

-- At most ONE open application per email (blocks duplicate submissions).
create unique index if not exists associate_applications_one_open_idx
  on public.associate_applications (applicant_email)
  where status in ('requested','awaiting_payment','payment_submitted');

create index if not exists associate_applications_status_idx
  on public.associate_applications (status, created_at desc);
create index if not exists associate_applications_email_idx
  on public.associate_applications (applicant_email);

drop trigger if exists associate_applications_touch_updated_at on public.associate_applications;
create trigger associate_applications_touch_updated_at
  before update on public.associate_applications
  for each row execute function public.touch_updated_at();


-- ────────────────────────────────────────────────────────────────────────
-- 2) Row Level Security: admin can READ; nobody writes directly.
--    Applicants have no direct access at all (they use the functions below).
-- ────────────────────────────────────────────────────────────────────────
alter table public.associate_applications enable row level security;

drop policy if exists "admin reads associate applications" on public.associate_applications;
create policy "admin reads associate applications"
  on public.associate_applications for select
  using (public.is_admin());


-- ────────────────────────────────────────────────────────────────────────
-- 3) Storage: private bucket for payment proofs
--    Path format: <application_id>/<random name>.<ext>
--    5 MB per file; images and PDF only. Only the admin can read. Uploads are
--    done by the server action (service role) after it checks the token.
-- ────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'associate-proofs', 'associate-proofs', false, 5242880,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin reads associate proofs" on storage.objects;
create policy "admin reads associate proofs"
  on storage.objects for select
  using (bucket_id = 'associate-proofs' and public.is_admin());


-- ────────────────────────────────────────────────────────────────────────
-- 4) PUBLIC functions (no login; the token is the key)
-- ────────────────────────────────────────────────────────────────────────

-- 4a) Submit an application. Returns the tracking token ONCE: the app must
--     show it to the applicant (as a link) and never store it.
create or replace function public.submit_associate_application(
  p_package_code text,
  p_name         text,
  p_email        text,
  p_phone        text default null,
  p_country      text default null,
  p_note         text default null,
  p_source       text default null
)
returns table (
  application_id     uuid,
  application_number bigint,
  tracking_token     text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pkg     public.associate_packages%rowtype;
  v_name    text := btrim(coalesce(p_name, ''));
  v_email   text := lower(btrim(coalesce(p_email, '')));
  v_phone   text := nullif(btrim(coalesce(p_phone, '')), '');
  v_country text := nullif(btrim(coalesce(p_country, '')), '');
  v_note    text := nullif(btrim(coalesce(p_note, '')), '');
  v_source  text := nullif(lower(btrim(coalesce(p_source, ''))), '');
  v_token   text;
  v_id      uuid;
  v_number  bigint;
begin
  if char_length(v_name) < 2 or char_length(v_name) > 100 then
    raise exception 'Please enter your name (2 to 100 characters)';
  end if;
  if char_length(v_email) < 3 or char_length(v_email) > 254
     or position('@' in v_email) < 2 then
    raise exception 'Please enter a valid email address';
  end if;
  if v_phone is not null and char_length(v_phone) not between 7 and 30 then
    raise exception 'Please enter a valid phone number';
  end if;
  if v_country is not null and char_length(v_country) > 60 then
    raise exception 'Country is too long';
  end if;
  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'Note is too long (500 characters at most)';
  end if;
  if v_source is not null and v_source !~ '^[a-z0-9_-]{1,40}$' then
    v_source := null;   -- a bad tag never blocks an application
  end if;

  select * into v_pkg
  from public.associate_packages
  where code = lower(btrim(coalesce(p_package_code, ''))) and status = 'active';
  if not found then
    raise exception 'That package is not available';
  end if;

  -- Two random UUIDs = 64 hex characters of unguessable token.
  v_token := replace(gen_random_uuid()::text, '-', '')
          || replace(gen_random_uuid()::text, '-', '');

  insert into public.associate_applications (
    tracking_token_hash,
    package_id, package_code, package_name, price_usd, commission_percent,
    applicant_name, applicant_email, applicant_phone, applicant_country,
    applicant_note, source
  ) values (
    encode(sha256(convert_to(v_token, 'UTF8')), 'hex'),
    v_pkg.id, v_pkg.code, v_pkg.name, v_pkg.price_usd, v_pkg.commission_percent,
    v_name, v_email, v_phone, v_country, v_note, v_source
  )
  returning id, number into v_id, v_number;

  application_id     := v_id;
  application_number := v_number;
  tracking_token     := v_token;
  return next;
  return;

exception
  when unique_violation then
    raise exception 'An application for this email is already in progress. Use the tracking link you were given.';
end;
$$;

-- 4b) The applicant's own application, found by token. Bank details appear
--     only once the admin has sent them. proof_path is never returned.
create or replace function public.get_my_application(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id',                 a.id,
    'number',             a.number,
    'status',             a.status,
    'package_name',       a.package_name,
    'price_usd',          a.price_usd,
    'commission_percent', a.commission_percent,
    'applicant_name',     a.applicant_name,
    'admin_note',         a.admin_note,
    'bank_details',       case when a.status in ('awaiting_payment','payment_submitted','approved')
                               then a.bank_details end,
    'has_proof',          a.proof_path is not null,
    'payment_reference',  a.payment_reference,
    'created_at',         a.created_at,
    'quoted_at',          a.quoted_at,
    'proof_submitted_at', a.proof_submitted_at,
    'decided_at',         a.decided_at
  )
  from public.associate_applications a
  where a.tracking_token_hash =
        encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
$$;

-- 4c) Cancel my application, only before the admin has sent bank details.
create or replace function public.cancel_my_application(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id     uuid;
  v_status text;
begin
  select a.id, a.status into v_id, v_status
  from public.associate_applications a
  where a.tracking_token_hash =
        encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
  for update;
  if not found then
    raise exception 'Application not found';
  end if;
  if v_status <> 'requested' then
    raise exception 'This application can no longer be cancelled. Please contact support.';
  end if;

  update public.associate_applications
  set status = 'cancelled', decided_at = now()
  where id = v_id;
end;
$$;

-- 4d) Attach proof of payment. The file must already be uploaded (by the
--     server action) to <application_id>/<file name>.
create or replace function public.submit_application_payment_proof(
  p_token        text,
  p_storage_path text,
  p_reference    text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id     uuid;
  v_status text;
  v_prefix text;
begin
  select a.id, a.status into v_id, v_status
  from public.associate_applications a
  where a.tracking_token_hash =
        encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
  for update;
  if not found then
    raise exception 'Application not found';
  end if;
  if v_status <> 'awaiting_payment' then
    raise exception 'Payment proof cannot be added to this application right now';
  end if;

  v_prefix := v_id::text || '/';
  if p_storage_path is null
     or left(p_storage_path, char_length(v_prefix)) <> v_prefix
     or char_length(p_storage_path) > 300 then
    raise exception 'Invalid proof file';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'associate-proofs' and name = p_storage_path
  ) then
    raise exception 'The proof file was not uploaded. Please try again.';
  end if;
  if char_length(coalesce(p_reference, '')) > 100 then
    raise exception 'Payment reference is too long (100 characters at most)';
  end if;

  update public.associate_applications
  set status             = 'payment_submitted',
      proof_path         = p_storage_path,
      payment_reference  = nullif(btrim(coalesce(p_reference, '')), ''),
      proof_submitted_at = now(),
      admin_note         = null
  where id = v_id;
end;
$$;


-- ────────────────────────────────────────────────────────────────────────
-- 5) ADMIN functions
-- ────────────────────────────────────────────────────────────────────────

-- 5a) Verify the application and send bank details.
create or replace function public.quote_associate_application(
  p_application_id uuid,
  p_bank_details   text,
  p_note           text default null
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
  if char_length(btrim(coalesce(p_bank_details, ''))) = 0 then
    raise exception 'Please add the bank details for the applicant';
  end if;
  if char_length(p_bank_details) > 2000 or char_length(coalesce(p_note, '')) > 500 then
    raise exception 'Bank details or note is too long';
  end if;

  select status into v_status
  from public.associate_applications where id = p_application_id for update;
  if not found then
    raise exception 'Application not found';
  end if;
  if v_status <> 'requested' then
    raise exception 'This application was already %', v_status;
  end if;

  update public.associate_applications
  set status       = 'awaiting_payment',
      bank_details = btrim(p_bank_details),
      admin_note   = nullif(btrim(coalesce(p_note, '')), ''),
      quoted_at    = now(),
      reviewed_by  = auth.uid()
  where id = p_application_id;
end;
$$;

-- 5b) Reject an application.
create or replace function public.reject_associate_application(
  p_application_id uuid,
  p_note           text
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
  if char_length(btrim(coalesce(p_note, ''))) = 0 then
    raise exception 'Please add a short note explaining the rejection';
  end if;
  if char_length(p_note) > 500 then
    raise exception 'Note is too long (500 characters at most)';
  end if;

  select status into v_status
  from public.associate_applications where id = p_application_id for update;
  if not found then
    raise exception 'Application not found';
  end if;
  if v_status <> 'requested' then
    raise exception 'This application was already %', v_status;
  end if;

  update public.associate_applications
  set status      = 'rejected',
      admin_note  = btrim(p_note),
      decided_at  = now(),
      reviewed_by = auth.uid()
  where id = p_application_id;
end;
$$;

-- 5c) Proof is not good enough: send it back to the applicant.
create or replace function public.return_associate_payment(
  p_application_id uuid,
  p_note           text
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
  if char_length(btrim(coalesce(p_note, ''))) = 0 then
    raise exception 'Please tell the applicant what is wrong with the proof';
  end if;
  if char_length(p_note) > 500 then
    raise exception 'Note is too long (500 characters at most)';
  end if;

  select status into v_status
  from public.associate_applications where id = p_application_id for update;
  if not found then
    raise exception 'Application not found';
  end if;
  if v_status <> 'payment_submitted' then
    raise exception 'There is no payment proof to return';
  end if;

  update public.associate_applications
  set status             = 'awaiting_payment',
      admin_note         = btrim(p_note),
      proof_path         = null,
      payment_reference  = null,
      proof_submitted_at = null,
      reviewed_by        = auth.uid()
  where id = p_application_id;
end;
$$;

-- 5d) Cancel an application that is waiting for payment (for example the
--     applicant never paid).
create or replace function public.cancel_associate_application(
  p_application_id uuid,
  p_note           text
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
  if char_length(btrim(coalesce(p_note, ''))) = 0 then
    raise exception 'Please add a short note explaining the cancellation';
  end if;
  if char_length(p_note) > 500 then
    raise exception 'Note is too long (500 characters at most)';
  end if;

  select status into v_status
  from public.associate_applications where id = p_application_id for update;
  if not found then
    raise exception 'Application not found';
  end if;
  if v_status not in ('awaiting_payment', 'payment_submitted') then
    raise exception 'Only an application waiting for payment can be cancelled';
  end if;

  update public.associate_applications
  set status      = 'cancelled',
      admin_note  = btrim(p_note),
      decided_at  = now(),
      reviewed_by = auth.uid()
  where id = p_application_id;
end;
$$;


-- ────────────────────────────────────────────────────────────────────────
-- 6) Who may call what. Admin functions re-check the role themselves.
-- ────────────────────────────────────────────────────────────────────────
revoke all on function public.submit_associate_application(text, text, text, text, text, text, text) from public, anon;
revoke all on function public.get_my_application(text)                                                from public, anon;
revoke all on function public.cancel_my_application(text)                                             from public, anon;
revoke all on function public.submit_application_payment_proof(text, text, text)                      from public, anon;
revoke all on function public.quote_associate_application(uuid, text, text)                           from public, anon;
revoke all on function public.reject_associate_application(uuid, text)                                from public, anon;
revoke all on function public.return_associate_payment(uuid, text)                                    from public, anon;
revoke all on function public.cancel_associate_application(uuid, text)                                from public, anon;

-- Applicants are not logged in, so the four token functions are open to anon.
grant execute on function public.submit_associate_application(text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.get_my_application(text)                                                to anon, authenticated;
grant execute on function public.cancel_my_application(text)                                             to anon, authenticated;
grant execute on function public.submit_application_payment_proof(text, text, text)                      to anon, authenticated;

grant execute on function public.quote_associate_application(uuid, text, text)   to authenticated;
grant execute on function public.reject_associate_application(uuid, text)        to authenticated;
grant execute on function public.return_associate_payment(uuid, text)            to authenticated;
grant execute on function public.cancel_associate_application(uuid, text)        to authenticated;

commit;

notify pgrst, 'reload schema';


-- ════════════════════════════════════════════════════════════════════════
-- VERIFICATION (optional, run one at a time)
-- ════════════════════════════════════════════════════════════════════════

-- A) RLS is on, and only the admin SELECT policy exists:
-- select tablename, rowsecurity from pg_tables
-- where schemaname = 'public' and tablename = 'associate_applications';
-- select policyname, cmd from pg_policies
-- where tablename = 'associate_applications';

-- B) All eight functions exist and are SECURITY DEFINER (prosecdef = true):
-- select proname, prosecdef from pg_proc
-- where pronamespace = 'public'::regnamespace
--   and proname in ('submit_associate_application','get_my_application',
--     'cancel_my_application','submit_application_payment_proof',
--     'quote_associate_application','reject_associate_application',
--     'return_associate_payment','cancel_associate_application')
-- order by proname;

-- C) The proofs bucket is private (public should be false):
-- select id, public, file_size_limit from storage.buckets
-- where id = 'associate-proofs';

-- D) Public submit works without a login (test as anon through the app or API;
--    the token is returned once). A second submit with the same email while
--    the first is open must fail with "already in progress".

-- NOTE: auth.uid() is empty in the SQL editor, so the admin functions cannot
-- be tested there. Test them through the app.