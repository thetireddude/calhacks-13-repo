# DEV1-003 — OTP auth UI with mock auth

## Status

ready

## Dependencies

- DEV1-002

## Execution

Primary role: implementer  
Review required: yes  
Tester required: no  
Worktree required: yes  
Developer lane: mobile  
Gate: Gate 1

## Goal

Email entry and OTP code submission screens against a mock `AuthClient`, with invalid/expired code states.

## Read first

- `AGENTS.md`
- `docs/project-dag.md`
- `state/CURRENT.md`
- `docs/developers/developer-1-mobile.md`
- `SPEC.md` — SPEC §3 Authentication, §10 Authentication
- `state/task-context/DEV1-003.md`
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

- Email entry screen with validation and request-code action.
- OTP code screen with submit, resend, and loading states.
- Mock `AuthClient` supports success, invalid-code, expired-code, and network-failure fixtures.
- Error UI uses the contract error schema shape if frozen; otherwise a mobile-local mock shape documented in the handoff.

## Critical correctness constraints

- Never display or mock other members' private availability or raw preference history.
- No client-side voting, fairness, or planner scoring rules; do not guess SPEC §11 items.
- Do not claim OTP rules (length, expiry, rate limit) beyond what the mock needs; mark them as unapproved in code comments/handoff.
- Never log email or OTP values.

## Acceptance criteria

- Mock OTP flow completes and lands on authenticated navigation.
- Invalid and expired codes show distinct, recoverable errors.
- Back/resend works without stuck state.

## Required tests

- Unit tests for mock AuthClient; screen tests for success/invalid/expired paths.

## Handoff

Commit `DEV1-003:` on `agent/DEV1-003-otp-auth-ui`, set status `candidate`, no merge. Report files changed, commands run (`pnpm --filter @gather/contracts build`, `pnpm --filter @gather/mobile typecheck`, `pnpm --filter @gather/mobile test`), results, limitations, what is not wired yet, and any SPEC §9 contract change requests.
