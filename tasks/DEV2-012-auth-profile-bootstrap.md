# DEV2-012 — Auth hardening + profile bootstrap

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

Harden JWT verification for Supabase-issued tokens when configured; ensure `GET /v1/me` returns stable profile stub (prepare for `profiles` row upsert when DB client available — optional upsert if DEV2-011 client exists, else document defer).

## Allowed files

- `apps/api/src/auth.ts`, `apps/api/src/app.ts`, `apps/api/src/auth.test.ts`
- `.env.example` (comments only if needed)

## Do not modify

- `apps/mobile/**`, `packages/planner/**`, store implementations except injectable hooks in `app.ts`

## Requirements

- Optional env: `SUPABASE_JWT_ISSUER` / audience validation when set (do not break existing test secret path).
- Tests: invalid iss rejected when configured; existing 401 tests still pass.
- `pnpm run test:ci` passes.

## Handoff

Commit `DEV2-012:`, status `candidate`, no merge.
