# DEV2-021 — Group schedule stub (no auto-run)

## Status

implementing

## Dependencies

- DEV2-019

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Worktree required: yes  
Developer lane: core-api

## Goal

`GET`/`PUT /v1/groups/:groupId/schedule` stores **config only**. Do **not** implement weekly auto-planning (SPEC §11).

## Allowed files

- `apps/api/src/groups/store.ts`, `supabaseStore.ts`, `routes.ts`, `groups.test.ts`
- `packages/contracts/src/groups.ts`, `index.ts` — additive `GroupSchedule` `{ timezone: string; weeklyEnabled: boolean }`
- `supabase/migrations/` — one new timestamped file `*_group_schedules.sql` if persisting (group_id PK → groups, timezone text, weekly_enabled bool)

## Do not modify

- `apps/mobile/**`, `packages/planner/**`, `apps/api/src/app.ts`
- Voting/planning/notification files
- Scheduler jobs, cron, or planning-run creation from schedule

## Requirements

- Auth + membership. 401 / 403 / 404 as existing group routes.
- GET missing schedule → defaults `{ timezone: "UTC", weeklyEnabled: false }`.
- PUT replaces those two fields; 400 if invalid (timezone non-empty string, weeklyEnabled boolean).
- In-memory + Supabase (if migration added) both implement get/put.
- `pnpm run test:ci` passes.

## Handoff

Commit `DEV2-021:`, status `candidate`, no merge.
