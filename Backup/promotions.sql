-- ════════════════════════════════════════════════════════════════
-- MIGRATION: stockist promotions (admin -> stockists only)
-- Same pattern as partner_announcements. Separate tables.
-- Needs: is_admin(), is_stockist(), touch_updated_at()
-- Lifecycle: draft -> published -> rewarded
--   "Live" and "Ended" are NOT stored. They come from starts_at / ends_at.
-- ════════════════════════════════════════════════════════════════

-- SECTION 1: tables
create table if not exists public.promotions (
  id              uuid primary key default gen_random_uuid(),
  title           text not null check (char_length(title) between 1 and 150),
  description     text not null default '' check (char_length(description) <= 5000),
  offer_type      text not null default 'other'
                    check (offer_type in ('free_tour', 'cash_prize', 'bonus', 'discount', 'other')),
  reward_details  text not null default '' check (char_length(reward_details) <= 1000),
  -- Target the stockist must reach, e.g. 500 units. null = no target.
  target_value    numeric check (target_value is null or target_value > 0),
  target_unit     text not null default 'units'
                    check (target_unit in ('units', 'amount')),
  terms           text not null default '' check (char_length(terms) <= 5000),
  banner_path     text unique,
  status          text not null default 'draft'
                    check (status in ('draft', 'published', 'rewarded')),
  starts_at       timestamptz,
  ends_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint promotions_dates_chk
    check (starts_at is null or ends_at is null or ends_at > starts_at),
  -- A promotion cannot leave draft without both dates.
  constraint promotions_publish_dates_chk
    check (status = 'draft' or (starts_at is not null and ends_at is not null))
);

create index if not exists promotions_status_idx
  on public.promotions (status, starts_at);

-- One row per (promotion, stockist): their progress and the final result.
create table if not exists public.promotion_entries (
  promotion_id   uuid not null
                   references public.promotions(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  progress       numeric not null default 0 check (progress >= 0),
  is_winner      boolean not null default false,
  reward_status  text not null default 'none'
                   check (reward_status in ('none', 'pending', 'fulfilled')),
  note           text not null default '' check (char_length(note) <= 500),
  updated_at     timestamptz not null default now(),
  primary key (promotion_id, user_id)
);

create index if not exists promotion_entries_user_idx
  on public.promotion_entries (user_id);

drop trigger if exists promotions_touch_updated_at on public.promotions;
create trigger promotions_touch_updated_at
  before update on public.promotions
  for each row execute function public.touch_updated_at();

drop trigger if exists promotion_entries_touch_updated_at on public.promotion_entries;
create trigger promotion_entries_touch_updated_at
  before update on public.promotion_entries
  for each row execute function public.touch_updated_at();


-- SECTION 2: Row Level Security
alter table public.promotions         enable row level security;
alter table public.promotion_entries  enable row level security;

-- promotions: admin full access
drop policy if exists "admin manages promotions" on public.promotions;
create policy "admin manages promotions"
  on public.promotions for all
  using (public.is_admin())
  with check (public.is_admin());

-- promotions: stockists see published/rewarded ones once started.
-- Ended promotions stay visible so they can see the result.
drop policy if exists "stockists read promotions" on public.promotions;
create policy "stockists read promotions"
  on public.promotions for select
  using (
    status in ('published', 'rewarded')
    and (starts_at is null or starts_at <= now())
    and public.is_stockist()
  );

-- entries: admin full access
drop policy if exists "admin manages promotion entries" on public.promotion_entries;
create policy "admin manages promotion entries"
  on public.promotion_entries for all
  using (public.is_admin())
  with check (public.is_admin());

-- entries: a stockist reads only their own row
drop policy if exists "stockist reads own promotion entry" on public.promotion_entries;
create policy "stockist reads own promotion entry"
  on public.promotion_entries for select
  using (user_id = auth.uid());


-- SECTION 3: private storage bucket for banners (5 MB, images only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'promotion-banners',
  'promotion-banners',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin manages promotion banners" on storage.objects;
create policy "admin manages promotion banners"
  on storage.objects for all
  using (bucket_id = 'promotion-banners' and public.is_admin())
  with check (bucket_id = 'promotion-banners' and public.is_admin());

-- Stockists may read a banner only if its promotion is visible to them
-- (the subquery runs under the promotions policy above).
drop policy if exists "stockists read promotion banners" on storage.objects;
create policy "stockists read promotion banners"
  on storage.objects for select
  using (
    bucket_id = 'promotion-banners'
    and exists (
      select 1 from public.promotions p
      where p.banner_path = name
    )
  );