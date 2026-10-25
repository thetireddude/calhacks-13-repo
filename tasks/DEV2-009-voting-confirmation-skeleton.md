# DEV2-009 — Voting and confirmed-event skeleton

## Status

candidate

## Dependencies

- DEV2-008

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Developer lane: core-api

## Goal

SPEC §6.2 skeleton: `PUT /v1/proposals/:proposalId/vote`, `POST /v1/proposals/:proposalId/veto`, `GET /v1/groups/:groupId/confirmed-event`. Stub consensus (simple majority of members on `approve`) until SPEC §11. Idempotent votes and single confirmation per group.

## Allowed files

- `apps/api/**`
- `supabase/migrations/**` (one additive file)
- `packages/contracts/**` (additive)

## Do not modify

- `apps/mobile/**`, `packages/planner/**`

## Acceptance criteria

- 401 without JWT; 403 non-member; 404 unknown proposal/group.
- PUT vote is upsert (idempotent).
- Veto distinct from vote body.
- Concurrent approval votes yield at most one confirmed event per group.
- `pnpm run test:dev2` passes.
