# DEV2-015 — Preferences + availability persistence

## Status

candidate

## Dependencies

- DEV2-011

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Worktree required: yes  
Developer lane: core-api

## Goal

When Supabase env is configured, persist `member_preferences` and `member_availability`. Keep in-memory default so CI does not need a database.

## Allowed files

- `apps/api/src/me/store.ts` (make methods `async` like `GroupsStore`)
- `apps/api/src/me/supabaseSetupStore.ts` (new)
- `apps/api/src/me/createMemberSetupStore.ts` (new)
- `apps/api/src/me/routes.ts` (`await` store calls)
- `apps/api/src/me.test.ts` (await if needed; keep privacy tests)
- `apps/api/src/app.ts` — **only** the `memberSetupStore` default: `options.memberSetupStore ?? createDefaultMemberSetupStore()`. Do not change `GET /v1/me` or add `profileStore`.

## Do not modify

- Profile / `GET /v1/me` files owned by DEV2-014
- `apps/mobile/**`, `packages/planner/**`
- Existing migration SQL
- `packages/contracts` (use existing DTOs)

## Requirements

- Reuse `apps/api/src/supabase/client.ts` env gate.
- Map `member_preferences` and `member_availability` per `20261024180100_preferences_availability.sql`.
- PUT availability still **replaces** the caller’s full window set (no merge).
- Scope all reads/writes to JWT `sub` only. Privacy tests must still prove user A cannot see user B prefs/availability.
- `learningOptIn` persists; do not send another member’s prefs into any planner path (none in this task).
- Upsert `profiles` for FK when writing (same pattern as `SupabaseGroupsStore.ensureProfile`). Live DB still needs `auth.users` for that UUID.
- No live-Supabase tests required. `pnpm run test:ci` must pass on in-memory default.

## Acceptance criteria

- Existing prefs/availability + privacy tests pass.
- Env-gated Supabase store selected when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set.

## Handoff

Commit `DEV2-015:`, status `candidate`, no merge.
