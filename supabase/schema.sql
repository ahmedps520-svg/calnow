-- ============================================================================
--  Calnow — Supabase schema
--  Paste this whole file into the Supabase SQL editor and press Run.
--  It is safe to run more than once.
--
--  Model: one shared family login. The signed-in auth user IS the household,
--  so every row carries user_id and Row Level Security scopes reads and writes
--  to that user. Nobody else can see a single row, including with the public
--  anon key, because every policy requires a matching authenticated session.
--
--  Kept deliberately compact: type-specific fields live in a jsonb payload
--  instead of thirty mostly-null columns, and the client strips empty values
--  before writing. Meal photos are never uploaded — they stay on the phone
--  that took them, and the row only records that one exists.
-- ============================================================================

-- ---------------------------------------------------------------- profiles --
-- Two rows per household: 'mom' and 'son'. data holds name, emoji, language,
-- body stats, targets and reminder settings.
create table if not exists public.profiles (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  key        text not null check (key in ('mom', 'son')),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- ----------------------------------------------------------------- entries --
-- Every logged thing: meal, glucose, insulin, weight, bp, water, activity,
-- symptom. data holds the fields for that type.
create table if not exists public.entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  profile_key text not null check (profile_key in ('mom', 'son')),
  type        text not null check (type in
                ('meal','glucose','insulin','weight','bp','water','activity','symptom')),
  ts          timestamptz not null,
  data        jsonb not null default '{}'::jsonb,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists entries_lookup
  on public.entries (user_id, profile_key, ts desc);

-- ------------------------------------------------------------------- foods --
-- The personal food library, so re-logging a usual meal is one tap.
create table if not exists public.foods (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  profile_key text not null check (profile_key in ('mom', 'son')),
  name        text not null,
  data        jsonb not null default '{}'::jsonb,
  uses        integer not null default 1,
  last_used   timestamptz not null default now(),
  unique (user_id, profile_key, name)
);

-- --------------------------------------------------------------------- RLS --
alter table public.profiles enable row level security;
alter table public.entries  enable row level security;
alter table public.foods    enable row level security;

drop policy if exists "own profiles" on public.profiles;
create policy "own profiles" on public.profiles
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own entries" on public.entries;
create policy "own entries" on public.entries
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own foods" on public.foods;
create policy "own foods" on public.foods
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------- realtime --
-- So a reading logged on her phone appears on yours without a refresh.
do $$
begin
  alter publication supabase_realtime add table public.entries;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null;
end $$;
