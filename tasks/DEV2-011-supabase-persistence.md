# DEV2-011 — Supabase persistence (Gate 2 start)

## Status

implementing

## Dependencies

- DEV2-010

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Worktree required: yes  
Developer lane: core-api

## Goal

Wire **groups + memberships + invites** to Supabase when env is configured; keep **in-memory stores as default** so `pnpm run test:ci` passes in CI without a running database.

## Allowed files

- `apps/api/**`
- `supabase/README.md`, `supabase/seed.sql` (optional seed for local demo)
- `packages/contracts/**` (additive only if required)

## Do not modify

- `apps/mobile/**`, `packages/planner/**`
- Existing migration SQL files (schema already landed)

## Requirements

- `createSupabaseAdminClient()` (or equivalent) from `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`; never commit secrets.
- `createApp()` selects Supabase-backed `GroupsStore` when env complete, else existing in-memory store.
- Map tables: `groups`, `group_memberships`, `group_invitations` per DEV2-003 migration.
- Preserve existing route behavior and tests (in-memory path unchanged for CI).
- Add focused tests for Supabase store **or** document skip pattern; minimum: unit tests still 27/27 on in-memory default.

## Acceptance criteria

- `pnpm run test:ci` passes in worktree.
- README note: local `supabase start` + env vars to enable DB-backed groups.

## Handoff

Commit `DEV2-011:`, status `candidate`, no merge.
