# DEV2-020 — Update profile display name

## Status

merged

## Dependencies

- DEV2-014

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Worktree required: yes  
Developer lane: core-api

## Goal

`PUT /v1/me` updates `profile.displayName` for the JWT subject. `GET /v1/me` already returns it.

## Allowed files

- `apps/api/src/me/profileStore.ts`
- `apps/api/src/me/supabaseProfileStore.ts`
- `apps/api/src/me/in-memory store in profileStore.ts`
- `apps/api/src/me/profileRoutes.ts`
- `apps/api/src/auth.test.ts`
- `packages/contracts` — additive only if needed; prefer parse `{ profile: { displayName: string | null } }` and return existing `MeResponse`.

## Do not modify

- `apps/mobile/**`, `packages/planner/**`
- `apps/api/src/app.ts`
- Groups routes/store (DEV2-019)
- Prefs/availability (`me/store.ts`, `me/routes.ts`)

## Requirements

- 401 without JWT. 400 if body invalid.
- In-memory store must persist displayName per `sub` for the process (today it always returns null).
- Supabase: update `profiles.display_name` for `id = sub` (upsert if missing).
- Do not return other users’ profiles.
- `pnpm run test:ci` passes.

## Handoff

Commit `DEV2-020:`, status `candidate`, no merge.
