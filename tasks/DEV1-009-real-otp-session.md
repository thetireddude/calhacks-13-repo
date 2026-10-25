# DEV1-009 — Real OTP and session wiring

## Status

backlog

## Dependencies

- DEV1-008
- GATE2-EXIT

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Worktree required: yes  
Developer lane: mobile  
Gate: Gate 3

## Goal

Replace mock `AuthClient` with Supabase email OTP via approved interfaces and send the session credential on API requests.

## Read first

- `AGENTS.md`
- `docs/project-dag.md`
- `state/CURRENT.md`
- `docs/developers/developer-1-mobile.md`
- `SPEC.md` — SPEC §8 Gate 3, §3 Authentication, §10 Authentication
- `state/task-context/DEV1-009.md`
- `packages/contracts/src/**` (consume only)

## Allowed files

- `apps/mobile/**`

## May modify if necessary

- pnpm-lock.yaml (Supabase client dep; integration owner ack)

## Do not modify

- `apps/api/**`, `supabase/**`, `packages/planner/**`
- `packages/contracts/**` (consume only; request changes via SPEC §9)
- Root workspace config (integration owner), except lockfile when adding a workspace dep and the task allows it

## Requirements

- Supabase email OTP request/verify through approved client interface.
- Session persisted via secure storage; logout clears it.
- Authenticated API client attaches the credential per the frozen auth contract.
- Invalid/expired OTP states preserved from DEV1-003.

## Critical correctness constraints

- Never display or mock other members' private availability or raw preference history.
- No client-side voting, fairness, or planner scoring rules; do not guess SPEC §11 items.
- Credential handling follows the frozen contract; do not guess (SPEC §6.4).
- Supabase keys only via env; only the public anon key ships in the app; update `.env.example` through the integration owner.

## Acceptance criteria

- OTP login completes on a physical device against the real backend.
- `/v1/me` call succeeds with the real session.

## Required tests

- Auth client tests with mocked Supabase SDK; manual physical-device smoke recorded in handoff.

## Handoff

Commit `DEV1-009:` on `agent/DEV1-009-real-otp-session`, set status `candidate`, no merge. Report files changed, commands run (`pnpm --filter @gather/contracts build`, `pnpm --filter @gather/mobile typecheck`, `pnpm --filter @gather/mobile test`), results, limitations, what is not wired yet, and any SPEC §9 contract change requests.
