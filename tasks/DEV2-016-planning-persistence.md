# DEV2-016 — Planning runs + proposals persistence

## Status

queued

## Dependencies

- DEV2-014
- DEV2-015

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Worktree required: yes  
Developer lane: core-api

## Goal

Env-gated Supabase store for `planning_runs` and `proposals`. In-memory default for CI. Planner stays mock.

## Allowed files

- `apps/api/src/planning/**`
- `apps/api/src/app.ts` — planning store default only
- `apps/api/src/planning.test.ts`

## Do not modify

- `apps/mobile/**`, `packages/planner/**`
- Voting store (DEV2-017)
- Existing migration SQL
- Unapproved SPEC §11 scheduler/revote rules

## Requirements

- Same env gate as DEV2-011.
- Preserve route behavior, membership checks, ≤3 proposals, failed-run retry.
- `pnpm run test:ci` passes without live DB.

## Handoff

Commit `DEV2-016:`, status `candidate`, no merge. Do not start until 014 and 015 are merged.
