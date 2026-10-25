# DEV2-017 — Votes, vetoes, confirmed-event persistence

## Status

candidate

## Dependencies

- DEV2-016

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Worktree required: yes  
Developer lane: core-api

## Goal

Env-gated Supabase store for `proposal_votes`, `proposal_vetoes`, `confirmed_events`. In-memory default for CI.

## Allowed files

- `apps/api/src/voting/**`
- `apps/api/src/app.ts` — voting store default only
- `apps/api/src/voting.test.ts`

## Do not modify

- `apps/mobile/**`, `packages/planner/**`
- Existing migration SQL
- SPEC §11: do **not** invent majority, deadline, or revote rules — keep Gate 1 stub confirmation semantics and veto ≠ `cant_make_it`.
- Confirmation must stay idempotent under concurrent stub majority.

## Requirements

- Same env gate as DEV2-011.
- `pnpm run test:ci` passes without live DB.

## Handoff

Commit `DEV2-017:`, status `candidate`, no merge. Do not start until 016 is merged.
