-- DEV2-009: proposal votes, vetoes, and confirmed events (Gate 1 stubs; consensus rules SPEC §11)

create table if not exists public.proposal_votes (
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  choice text not null,
  updated_at timestamptz not null default now(),
  primary key (proposal_id, user_id),
  constraint proposal_votes_choice_stub check (choice in ('approve', 'cant_make_it'))
);

create index if not exists proposal_votes_proposal_idx on public.proposal_votes (proposal_id);

create table if not exists public.proposal_vetoes (
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (proposal_id, user_id)
);

create index if not exists proposal_vetoes_proposal_idx on public.proposal_vetoes (proposal_id);

create table if not exists public.confirmed_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  proposal_id uuid not null references public.proposals (id) on delete restrict,
  planning_run_id uuid not null references public.planning_runs (id) on delete restrict,
  summary text not null,
  confirmed_at timestamptz not null default now(),
  constraint confirmed_events_one_per_group unique (group_id)
);

alter table public.proposal_votes enable row level security;
alter table public.proposal_vetoes enable row level security;
alter table public.confirmed_events enable row level security;

create policy "proposal_votes_select_member" on public.proposal_votes
  for select using (
    exists (
      select 1
      from public.proposals p
      join public.planning_runs pr on pr.id = p.planning_run_id
      join public.group_memberships gm on gm.group_id = pr.group_id
      where p.id = proposal_votes.proposal_id and gm.user_id = auth.uid()
    )
  );

create policy "proposal_votes_upsert_member" on public.proposal_votes
  for all using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.proposals p
      join public.planning_runs pr on pr.id = p.planning_run_id
      join public.group_memberships gm on gm.group_id = pr.group_id
      where p.id = proposal_votes.proposal_id and gm.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.proposals p
      join public.planning_runs pr on pr.id = p.planning_run_id
      join public.group_memberships gm on gm.group_id = pr.group_id
      where p.id = proposal_votes.proposal_id and gm.user_id = auth.uid()
    )
  );

create policy "proposal_vetoes_select_member" on public.proposal_vetoes
  for select using (
    exists (
      select 1
      from public.proposals p
      join public.planning_runs pr on pr.id = p.planning_run_id
      join public.group_memberships gm on gm.group_id = pr.group_id
      where p.id = proposal_vetoes.proposal_id and gm.user_id = auth.uid()
    )
  );

create policy "proposal_vetoes_insert_member" on public.proposal_vetoes
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.proposals p
      join public.planning_runs pr on pr.id = p.planning_run_id
      join public.group_memberships gm on gm.group_id = pr.group_id
      where p.id = proposal_vetoes.proposal_id and gm.user_id = auth.uid()
    )
  );

create policy "confirmed_events_select_member" on public.confirmed_events
  for select using (
    exists (
      select 1 from public.group_memberships gm
      where gm.group_id = confirmed_events.group_id and gm.user_id = auth.uid()
    )
  );
