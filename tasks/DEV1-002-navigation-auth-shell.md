# DEV1-002 — Navigation and auth shell

## Status

done

## Dependencies

- DEV1-001

## Execution

Primary role: implementer  
Review required: yes  
Tester required: no  
Worktree required: yes  
Developer lane: mobile  
Gate: Gate 1

## Goal

Navigation skeleton with signed-out and signed-in stacks, a mock session store, and logout.

## Read first

- `AGENTS.md`
- `docs/project-dag.md`
- `state/CURRENT.md`
- `docs/developers/developer-1-mobile.md`
- `SPEC.md` — SPEC §3 Authentication, Gate 1 Dev 1
- `state/task-context/DEV1-002.md`
- `packages/contracts/src/**` (consume only)

## Allowed files

- `apps/mobile/**`

## May modify if necessary

- none

## Do not modify

- `apps/api/**`, `supabase/**`, `packages/planner/**`
- `packages/contracts/**` (consume only; request changes via SPEC §9)
- Root workspace config (integration owner), except lockfile when adding a workspace dep and the task allows it

## Requirements

- Auth-gated navigation: signed-out stack (email/OTP placeholders) vs authenticated tabs/stack (groups, planning, events, notifications placeholders).
- Mock session provider with sign-in/sign-out state; logout returns to signed-out stack.
- Session handling isolated behind a small `AuthClient` interface so real Supabase can replace the mock (DEV1-009).

## Critical correctness constraints

- Never display or mock other members' private availability or raw preference history.
- No client-side voting, fairness, or planner scoring rules; do not guess SPEC §11 items.
- No real credentials or tokens persisted in plain storage beyond the mock.
- Do not invent token formats; session shape follows approved contract or stays an opaque mock type local to mobile.

## Acceptance criteria

- Unauthenticated user cannot reach authenticated screens.
- Logout clears mock session and returns to email screen.

## Required tests

- Navigation gating test; logout test.

## Handoff

Commit `DEV1-002:` on `agent/DEV1-002-navigation-auth-shell`, set status `candidate`, no merge. Report files changed, commands run (`pnpm --filter @gather/contracts build`, `pnpm --filter @gather/mobile typecheck`, `pnpm --filter @gather/mobile test`), results, limitations, what is not wired yet, and any SPEC §9 contract change requests.
