-- ════════════════════════════════════════════════════════════════
-- MIGRATION: partner announcements (admin -> affiliates / stockists)
-- Separate from the storefront "announcements" table, which is untouched.
-- Needs: is_admin(), is_affiliate(), is_stockist(), touch_updated_at()
-- ════════════════════════════════════════════════════════════════

-- SECTION 1: tables
create table if not exists public.partner_announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 150),
  body        text not null default '' check (char_length(body) <= 5000),
  audience    text not null default 'both'
                check (audience in ('affiliates', 'stockists', 'both')),
  is_active   boolean not null default true,
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint partner_announcements_dates_chk
    check (starts_at is null or ends_at is null or ends_at > starts_at)
);

create index if not exists partner_announcements_audience_idx
  on public.partner_announcements (audience, is_active);

create table if not exists public.partner_announcement_files (
  id               uuid primary key default gen_random_uuid(),
  announcement_id  uuid not null
                     references public.partner_announcements(id) on delete cascade,
  storage_path     text not null unique,
  file_name        text not null check (char_length(file_name) <= 200),
  mime_type        text not null
                     check (mime_type in ('application/pdf', 'image/png', 'image/jpeg', 'image/webp')),
  size_bytes       integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_at       timestamptz not null default now()
);

create index if not exists partner_announcement_files_ann_idx
  on public.partner_announcement_files (announcement_id);

-- One row per (announcement, user) once they have opened it.
create table if not exists public.partner_announcement_reads (
  announcement_id  uuid not null
                     references public.partner_announcements(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  read_at          timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

drop trigger if exists partner_announcements_touch_updated_at
  on public.partner_announcements;
create trigger partner_announcements_touch_updated_at
  before update on public.partner_announcements
  for each row execute function public.touch_updated_at();


-- SECTION 2: does this audience value match the signed-in user's role?
create or replace function public.partner_audience_matches(a text)
returns boolean
language sql
stable
as $$
  select (a in ('affiliates', 'both') and public.is_affiliate())
      or (a in ('stockists',  'both') and public.is_stockist());
$$;


-- SECTION 3: Row Level Security
alter table public.partner_announcements       enable row level security;
alter table public.partner_announcement_files  enable row level security;
alter table public.partner_announcement_reads  enable row level security;

-- announcements: admin full access
drop policy if exists "admin manages partner announcements"
  on public.partner_announcements;
create policy "admin manages partner announcements"
  on public.partner_announcements for all
  using (public.is_admin())
  with check (public.is_admin());

-- announcements: partners read only live rows meant for their role
drop policy if exists "partners read own audience announcements"
  on public.partner_announcements;
create policy "partners read own audience announcements"
  on public.partner_announcements for select
  using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at   is null or ends_at   >  now())
    and public.partner_audience_matches(audience)
  );

-- files: admin full access
drop policy if exists "admin manages partner announcement files"
  on public.partner_announcement_files;
create policy "admin manages partner announcement files"
  on public.partner_announcement_files for all
  using (public.is_admin())
  with check (public.is_admin());

-- files: partners see files only of announcements they can see
-- (the subquery runs under the policy above, so audience rules apply)
drop policy if exists "partners read visible announcement files"
  on public.partner_announcement_files;
create policy "partners read visible announcement files"
  on public.partner_announcement_files for select
  using (
    exists (
      select 1 from public.partner_announcements a
      where a.id = announcement_id
    )
  );

-- reads: admin can see read status, users manage only their own rows
drop policy if exists "admin reads announcement reads"
  on public.partner_announcement_reads;
create policy "admin reads announcement reads"
  on public.partner_announcement_reads for select
  using (public.is_admin());

drop policy if exists "user reads own announcement reads"
  on public.partner_announcement_reads;
create policy "user reads own announcement reads"
  on public.partner_announcement_reads for select
  using (user_id = auth.uid());

drop policy if exists "user marks own announcement read"
  on public.partner_announcement_reads;
create policy "user marks own announcement read"
  on public.partner_announcement_reads for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.partner_announcements a
      where a.id = announcement_id
    )
  );


-- SECTION 4: private storage bucket (10 MB, PDF + images only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'partner-announcements',
  'partner-announcements',
  false,
  10485760,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin manages partner announcement objects"
  on storage.objects;
create policy "admin manages partner announcement objects"
  on storage.objects for all
  using (bucket_id = 'partner-announcements' and public.is_admin())
  with check (bucket_id = 'partner-announcements' and public.is_admin());

-- Partners may read (and get signed URLs for) an object only if its
-- file row is visible to them, which ties access to the audience rule.
drop policy if exists "partners read announcement objects"
  on storage.objects;
create policy "partners read announcement objects"
  on storage.objects for select
  using (
    bucket_id = 'partner-announcements'
    and exists (
      select 1 from public.partner_announcement_files f
      where f.storage_path = name
    )
  );