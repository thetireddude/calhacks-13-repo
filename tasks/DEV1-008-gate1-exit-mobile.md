# DEV1-008 — Gate 1 exit (mobile lane)

## Status

backlog

## Dependencies

- DEV1-007

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Worktree required: yes  
Developer lane: mobile  
Gate: Gate 1

## Goal

Close Gate 1 for Developer 1: verify the mobile vertical builds/tests independently and document evidence.

## Read first

- `AGENTS.md`
- `docs/project-dag.md`
- `state/CURRENT.md`
- `docs/developers/developer-1-mobile.md`
- `SPEC.md` — SPEC §8 Gate 1 Developer 1, §3 Acceptance tests
- `state/task-context/DEV1-008.md`
- `packages/contracts/src/**` (consume only)

## Allowed files

- `apps/mobile/README.md`
- `docs/gate1-dev1-exit.md` (new)
- `state/GATE1-DEV1-EXIT.md` (new)
- `tasks/index.md`, `state/CURRENT.md` (status only)

## May modify if necessary

- `.github/workflows/ci.yml` (only with integration owner approval, to add `test:dev1`)

## Do not modify

- `apps/api/**`, `supabase/**`, `packages/planner/**`
- `packages/contracts/**` (consume only; request changes via SPEC §9)
- Root workspace config (integration owner), except lockfile when adding a workspace dep and the task allows it

## Requirements

- Checklist mapping each SPEC §8 Gate 1 Dev 1 bullet and §3 acceptance test to evidence or an explicit not-yet-integrated note.
- `pnpm run test:dev1` (or documented equivalent) passes.
- List of contract change requests raised during DEV1-004..007 (schedule, notifications, push devices, ICS, suggest-another).

## Critical correctness constraints

- Never display or mock other members' private availability or raw preference history.
- No client-side voting, fairness, or planner scoring rules; do not guess SPEC §11 items.
- No new product features in this task.
- Do not claim integration tests that run only against mocks.

## Acceptance criteria

- Checklist complete and honest about mock-only coverage.
- Mobile typecheck and tests pass.

## Required tests

- Run the full mobile suite.

## Handoff

Commit `DEV1-008:` on `agent/DEV1-008-gate1-exit-mobile`, set status `candidate`, no merge. Report files changed, commands run (`pnpm --filter @gather/contracts build`, `pnpm --filter @gather/mobile typecheck`, `pnpm --filter @gather/mobile test`), results, limitations, what is not wired yet, and any SPEC §9 contract change requests.
