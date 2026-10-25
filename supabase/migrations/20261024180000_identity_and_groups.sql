-- DEV2-003: profiles, groups, memberships, invitations (SPEC §4 logical resources)

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.group_memberships (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.group_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  token text not null unique,
  created_by uuid not null references public.profiles (id) on delete restrict,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists group_invitations_token_idx on public.group_invitations (token);

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_memberships enable row level security;
alter table public.group_invitations enable row level security;

-- RLS: minimal Gate 1 stubs; tighten before production (DEV2-005+).
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "groups_select_member" on public.groups
  for select using (
    exists (
      select 1 from public.group_memberships gm
      where gm.group_id = groups.id and gm.user_id = auth.uid()
    )
  );

create policy "memberships_select_member" on public.group_memberships
  for select using (
    exists (
      select 1 from public.group_memberships gm
      where gm.group_id = group_memberships.group_id and gm.user_id = auth.uid()
    )
  );
