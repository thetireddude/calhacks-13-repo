-- DEV2-004: private preferences and availability (member-owned; not group-readable via RLS)

create table if not exists public.member_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  activity_tags text[] default '{}',
  budget_min numeric,
  budget_max numeric,
  travel_radius_km numeric,
  learning_opt_in boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.member_availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  label text,
  created_at timestamptz not null default now()
);

create index if not exists member_availability_user_idx on public.member_availability (user_id);

alter table public.member_preferences enable row level security;
alter table public.member_availability enable row level security;

create policy "prefs_own_only" on public.member_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "availability_own_only" on public.member_availability
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
