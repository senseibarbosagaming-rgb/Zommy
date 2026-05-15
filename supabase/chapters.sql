-- Zommy Chapters / Time Capsules setup
-- Run this in the Supabase SQL editor for the project used by the app.

create table if not exists public.capsules (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id text not null,
  type text not null check (type in ('monthly', 'birthday', 'yearly', 'custom', 'future')),
  period_start date not null,
  period_end date not null,
  title text not null,
  letter text default '',
  status text not null default 'draft' check (status in ('draft', 'locked')),
  locked_at timestamptz,
  unlock_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.capsule_items (
  id text primary key,
  capsule_id text not null references public.capsules(id) on delete cascade,
  entry_id bigint not null,
  sort_order integer not null default 0,
  highlight_note text default '',
  created_at timestamptz not null default now()
);

create index if not exists capsules_user_profile_period_idx on public.capsules(user_id, profile_id, type, period_start);
create index if not exists capsule_items_capsule_sort_idx on public.capsule_items(capsule_id, sort_order);

create or replace function public.set_capsules_updated_at()
returns trigger
language plpgsql
security definer
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_capsules_updated_at on public.capsules;
create trigger set_capsules_updated_at
before update on public.capsules
for each row execute function public.set_capsules_updated_at();

alter table public.capsules enable row level security;
alter table public.capsule_items enable row level security;

create policy "capsules_select_own" on public.capsules
  for select using (auth.uid() = user_id);

create policy "capsules_insert_own" on public.capsules
  for insert with check (auth.uid() = user_id);

create policy "capsules_update_own" on public.capsules
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "capsules_delete_own" on public.capsules
  for delete using (auth.uid() = user_id);

create policy "capsule_items_select_own" on public.capsule_items
  for select using (
    exists (
      select 1 from public.capsules
      where public.capsules.id = capsule_items.capsule_id
      and public.capsules.user_id = auth.uid()
    )
  );

create policy "capsule_items_insert_own" on public.capsule_items
  for insert with check (
    exists (
      select 1 from public.capsules
      where public.capsules.id = capsule_items.capsule_id
      and public.capsules.user_id = auth.uid()
    )
  );

create policy "capsule_items_update_own" on public.capsule_items
  for update using (
    exists (
      select 1 from public.capsules
      where public.capsules.id = capsule_items.capsule_id
      and public.capsules.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.capsules
      where public.capsules.id = capsule_items.capsule_id
      and public.capsules.user_id = auth.uid()
    )
  );

create policy "capsule_items_delete_own" on public.capsule_items
  for delete using (
    exists (
      select 1 from public.capsules
      where public.capsules.id = capsule_items.capsule_id
      and public.capsules.user_id = auth.uid()
    )
  );
