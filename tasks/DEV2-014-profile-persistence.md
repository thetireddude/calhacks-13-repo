# DEV2-014 — Profile persistence (`GET /v1/me`)

## Status

implementing

## Dependencies

- DEV2-011
- DEV2-012

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Worktree required: yes  
Developer lane: core-api

## Goal

When Supabase env is configured, persist and read `profiles` for `GET /v1/me`. Keep the in-memory / stub path as default so CI does not need a database.

## Allowed files

- `apps/api/src/me/profileStore.ts` (new)
- `apps/api/src/me/supabaseProfileStore.ts` (new)
- `apps/api/src/me/createProfileStore.ts` (new)
- `apps/api/src/me/profileRoutes.ts` (new — move or register `GET /v1/me` here)
- `apps/api/src/auth.test.ts` (extend `/v1/me` assertions only)
- `apps/api/src/app.ts` — **only** `CreateAppOptions.profileStore`, `createDefaultProfileStore()`, and `registerProfileRoutes`. Do not change `memberSetupStore` wiring.

## Do not modify

- `apps/api/src/me/store.ts`, `apps/api/src/me/routes.ts`, `apps/api/src/me.test.ts` (DEV2-015)
- `apps/mobile/**`, `packages/planner/**`
- Existing migration SQL
- `packages/contracts` unless a field is already on the frozen `GET /v1/me` DTO

## Requirements

- Reuse `isSupabaseGroupsEnvConfigured()` / `createSupabaseAdminClient()` from `apps/api/src/supabase/client.ts`. Same env gate as groups.
- On `GET /v1/me` with JWT: upsert `profiles` row `{ id: sub }` if missing; return `id` + `profile.displayName` from the row (`null` if unset).
- In-memory default: same response as today (`displayName: null`) so existing tests pass.
- JWT `sub` that is not a UUID cannot satisfy `profiles.id` FK to `auth.users` in live DB — document that DB mode needs a real Supabase user; do not add live-DB tests.
- Do not expose other users’ profiles.
- `pnpm run test:ci` must pass.

## Acceptance criteria

- Existing `/v1/me` 401 and happy-path tests still pass (in-memory).
- `createDefaultProfileStore()` selects Supabase when env is set.
- Handoff notes DB-mode UUID/`auth.users` constraint.

## Handoff

Commit `DEV2-014:`, status `candidate`, no merge.
