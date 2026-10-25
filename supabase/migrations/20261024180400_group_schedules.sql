-- DEV2-021: group schedule config only (no auto-planning / cron)

create table if not exists public.group_schedules (
  group_id uuid primary key references public.groups (id) on delete cascade,
  timezone text not null,
  weekly_enabled boolean not null default false
);

alter table public.group_schedules enable row level security;

create policy "group_schedules_select_member" on public.group_schedules
  for select using (
    exists (
      select 1 from public.group_memberships gm
      where gm.group_id = group_schedules.group_id and gm.user_id = auth.uid()
    )
  );

create policy "group_schedules_upsert_member" on public.group_schedules
  for all using (
    exists (
      select 1 from public.group_memberships gm
      where gm.group_id = group_schedules.group_id and gm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.group_memberships gm
      where gm.group_id = group_schedules.group_id and gm.user_id = auth.uid()
    )
  );
