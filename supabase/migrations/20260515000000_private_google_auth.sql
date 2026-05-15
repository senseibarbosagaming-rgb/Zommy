-- Zommy private Google-auth setup.
-- Run this in the Supabase SQL editor after Google Auth is enabled.
-- User chose a clean reset, so this migration removes existing app rows.

begin;

-- Clean app data for the new private-per-user model.
truncate table public.entries restart identity cascade;
truncate table public.profiles restart identity cascade;

-- Profiles belong to exactly one authenticated user.
alter table public.profiles
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.profiles
  alter column user_id set not null;

-- Entries belong to exactly one authenticated user and store a private Storage path.
alter table public.entries
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists photo_path text;

alter table public.entries
  alter column user_id set not null,
  alter column photo_path set not null;

-- The React app now reads photo_path and creates signed URLs, so the legacy public
-- photo URL column is no longer needed for new rows. Leave it nullable if it exists.
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
