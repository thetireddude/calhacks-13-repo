-- DEV2-007: planning runs and group-visible proposals (Gate 1 stubs; status values minimal)

create table if not exists public.planning_runs (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  status text not null default 'pending',
  initiated_by uuid not null references public.profiles (id) on delete restrict,
  activity_request text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists planning_runs_group_idx on public.planning_runs (group_id);

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  planning_run_id uuid not null references public.planning_runs (id) on delete cascade,
  rank integer not null,
  summary text not null,
  deterministic_score numeric,
  explanation text,
  revision_id text,
  created_at timestamptz not null default now(),
  constraint proposals_rank_positive check (rank >= 1)
);

create index if not exists proposals_run_idx on public.proposals (planning_run_id);

alter table public.planning_runs enable row level security;
alter table public.proposals enable row level security;

create policy "planning_runs_select_member" on public.planning_runs
  for select using (
    exists (
      select 1 from public.group_memberships gm
      where gm.group_id = planning_runs.group_id and gm.user_id = auth.uid()
    )
  );

create policy "planning_runs_insert_member" on public.planning_runs
  for insert with check (
    initiated_by = auth.uid()
    and exists (
      select 1 from public.group_memberships gm
      where gm.group_id = planning_runs.group_id and gm.user_id = auth.uid()
    )
  );

create policy "proposals_select_member" on public.proposals
  for select using (
    exists (
      select 1
      from public.planning_runs pr
      join public.group_memberships gm on gm.group_id = pr.group_id
      where pr.id = proposals.planning_run_id and gm.user_id = auth.uid()
    )
  );
