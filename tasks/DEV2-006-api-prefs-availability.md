# DEV2-006 — API: preferences and availability

## Status

implementing

## Dependencies

- DEV2-004
- DEV2-005

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Worktree required: yes  
Developer lane: core-api

## Goal

Implement SPEC §6.2 `GET/PUT /v1/me/preferences` and `GET/PUT /v1/me/availability` with JWT auth. Gate 1 may use an **in-memory per-user store** (same pattern as `apps/api/src/groups/store.ts`) aligned with migration columns in `20261024180100_preferences_availability.sql`.

## Read first

- `AGENTS.md`, `state/CURRENT.md`, `docs/developers/developer-2-core-api.md`
- `apps/api/src/groups/routes.ts`, `apps/api/src/auth.test.ts`
- `supabase/migrations/20261024180100_preferences_availability.sql`

## Allowed files

- `apps/api/**`
- `packages/contracts/**` (additive preference/availability DTOs + `CONTRACTS_VERSION` bump if needed)

## Do not modify

- `apps/mobile/**`, `packages/planner/**`, existing migration files (no new migrations in this task)

## Requirements

- 401 without JWT on all new routes.
- GET/PUT preferences: `activityTags`, budget fields, `travelRadiusKm`, `learningOptIn` (camelCase in JSON).
- GET/PUT availability: list of windows `{ startsAt, endsAt, label? }`; PUT replaces user’s set (stub semantics documented in code comment).
- **Privacy tests:** responses for user A must never include user B’s preferences or availability (attempt cross-user access via forged ids if applicable — should remain scoped to JWT subject).

## Acceptance criteria

- `pnpm --filter @gather/api test` passes with new route tests.
- Privacy test(s) assert forbidden cross-user fields absent.

## Handoff

Commit prefix `DEV2-006:`; status `candidate`; no merge to main.
