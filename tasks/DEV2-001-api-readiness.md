# DEV2-001 — API service bootstrap

## Status

candidate

## Dependencies

- GATE0-001

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Worktree required: yes  
Developer lane: core-api

## Goal

Initialize Node.js + TypeScript API in `apps/api` on `feature/core-api` with health check, Supabase client wiring, and route skeleton aligned to SPEC §6.2 inventory.

## Read first

- `docs/developers/developer-2-backend.md`
- `SPEC.md` §4, §6.2

## Allowed files

- `apps/api/**`
- `supabase/config.toml` or equivalent local dev stub if needed

## Do not modify

- `apps/mobile/**`, `packages/planner/**`

## Acceptance criteria

- Server starts; `GET /health` (or `/v1/health`) returns OK.
- Auth middleware stub validates Supabase JWT shape (full OTP flow in Gate 1).
- Route list documented vs SPEC §6.2 (implemented vs stub).

## Required tests

- Health endpoint integration test with mock env.

## Notes

Unblocked when GATE0-001 completes.
