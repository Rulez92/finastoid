-- ════════════════════════════════════════════════════════════════
-- MIGRATION: affiliate profile photo
-- Private bucket. Each affiliate can touch only their own folder:
--   {auth.uid()}/avatar-{uuid}.{ext}
-- ════════════════════════════════════════════════════════════════

alter table public.affiliates
  add column if not exists avatar_path text;

-- Private bucket, 2 MB, images only
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'affiliate-avatars',
  'affiliate-avatars',
  false,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Affiliate: full control of objects inside their own folder only
drop policy if exists "affiliate manages own avatar" on storage.objects;
create policy "affiliate manages own avatar"
  on storage.objects for all
  using (
    bucket_id = 'affiliate-avatars'
    and public.is_affiliate()
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'affiliate-avatars'
    and public.is_affiliate()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admin: can view every avatar (for the affiliate pages in admin)
drop policy if exists "admin reads avatars" on storage.objects;
create policy "admin reads avatars"
  on storage.objects for select
  using (bucket_id = 'affiliate-avatars' and public.is_admin());