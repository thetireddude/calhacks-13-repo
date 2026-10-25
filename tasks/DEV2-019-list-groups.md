# DEV2-019 — List my groups

## Status

merged

## Dependencies

- DEV2-011

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Worktree required: yes  
Developer lane: core-api

## Goal

`GET /v1/groups` returns groups the JWT subject is a member of. Needed for mobile (no list exists today).

## Allowed files

- `apps/api/src/groups/store.ts`
- `apps/api/src/groups/supabaseStore.ts`
- `apps/api/src/groups/routes.ts`
- `apps/api/src/groups.test.ts`
- `packages/contracts/src/groups.ts` / `index.ts` — **additive only** if a wrapper type is required; otherwise return `GroupResponse[]` or `{ groups: GroupResponse[] }` and document the choice. Prefer `{ groups: GroupResponse[] }` to match members `{ members }`.

## Do not modify

- `apps/mobile/**`, `packages/planner/**`
- `apps/api/src/app.ts` (DEV2-018)
- Profile / me routes (DEV2-020)
- Migration SQL

## Requirements

- Auth required; 401 without JWT.
- Only groups where `isMember(groupId, sub)`.
- In-memory + Supabase store both implement `listGroupsForUser(userId)`.
- Existing create/get/invite tests still pass.
- `pnpm run test:ci` passes.

## Handoff

Commit `DEV2-019:`, status `candidate`, no merge.
