-- Zommy private Google-auth setup.
-- This migration upgrades the original public-data model to per-user private data.
-- It is intentionally non-destructive: existing profiles/entries are preserved and
-- assigned to the single existing authenticated owner when possible.

begin;

-- Profiles belong to exactly one authenticated user.
alter table public.profiles
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Entries belong to exactly one authenticated user and store a private Storage path.
alter table public.entries
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists photo_path text;

-- Backfill legacy rows when the project has exactly one authenticated user.
-- This keeps the existing memories instead of truncating them.
with single_owner as (
  select id
  from auth.users
  order by created_at asc
  limit 1
), owner_count as (
  select count(*) as total
  from auth.users
)
update public.profiles
set user_id = (select id from single_owner)
where user_id is null
  and (select total from owner_count) = 1;

update public.entries e
set user_id = p.user_id
from public.profiles p
where e.profile_id = p.id
  and e.user_id is null
  and p.user_id is not null;

with single_owner as (
  select id
  from auth.users
  order by created_at asc
  limit 1
), owner_count as (
  select count(*) as total
  from auth.users
)
update public.entries
set user_id = (select id from single_owner)
where user_id is null
  and (select total from owner_count) = 1;

-- Preserve legacy public photo URLs as photo_path fallbacks.
-- New private uploads store storage object paths under <auth.uid()>/...
update public.entries
set photo_path = photo
where photo_path is null
  and photo is not null;

-- The app writes photo_path for new private rows. Existing legacy rows may still
-- have public URLs in photo_path, so keep photo_path nullable for safer upgrades.
alter table public.profiles
  alter column user_id set not null;

alter table public.entries
  alter column user_id set not null;

alter table public.entries
  alter column photo drop not null;

create unique index if not exists profiles_id_user_id_key
  on public.profiles (id, user_id);

-- Keep profile ownership and entry ownership aligned.
alter table public.entries
  drop constraint if exists entries_profile_owner_match;

alter table public.entries
  add constraint entries_profile_owner_match
  foreign key (profile_id, user_id)
  references public.profiles(id, user_id)
  on delete cascade;

create index if not exists profiles_user_id_idx on public.profiles (user_id);
create index if not exists entries_user_id_idx on public.entries (user_id);
create index if not exists entries_profile_id_user_id_idx on public.entries (profile_id, user_id);

alter table public.profiles enable row level security;
alter table public.entries enable row level security;

-- Recreate policies idempotently.
drop policy if exists "Users can read their profiles" on public.profiles;
drop policy if exists "Users can insert their profiles" on public.profiles;
drop policy if exists "Users can update their profiles" on public.profiles;
drop policy if exists "Users can delete their profiles" on public.profiles;

drop policy if exists "Users can read their entries" on public.entries;
drop policy if exists "Users can insert their entries" on public.entries;
drop policy if exists "Users can update their entries" on public.entries;
drop policy if exists "Users can delete their entries" on public.entries;

create policy "Users can read their profiles"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert their profiles"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update their profiles"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their profiles"
  on public.profiles for delete
  using (auth.uid() = user_id);

create policy "Users can read their entries"
  on public.entries for select
  using (auth.uid() = user_id);

create policy "Users can insert their entries"
  on public.entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update their entries"
  on public.entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their entries"
  on public.entries for delete
  using (auth.uid() = user_id);

-- Make the photos bucket private. If it does not exist yet, create it.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do update set public = false;

drop policy if exists "Users can read their photos" on storage.objects;
drop policy if exists "Users can insert their photos" on storage.objects;
drop policy if exists "Users can update their photos" on storage.objects;
drop policy if exists "Users can delete their photos" on storage.objects;

create policy "Users can read their photos"
  on storage.objects for select
  using (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can insert their photos"
  on storage.objects for insert
  with check (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update their photos"
  on storage.objects for update
  using (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete their photos"
  on storage.objects for delete
  using (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);

commit;
