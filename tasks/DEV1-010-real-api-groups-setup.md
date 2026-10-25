# DEV1-010 — Real API: groups and member setup

## Status

blocked

## Dependencies

- DEV1-009

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Worktree required: yes  
Developer lane: mobile  
Gate: Gate 3

## Goal

Swap mock group and member-setup clients for real HTTP clients; preferences and availability persist via the API.

## Read first

- `AGENTS.md`
- `docs/project-dag.md`
- `state/CURRENT.md`
- `docs/developers/developer-1-mobile.md`
- `SPEC.md` — SPEC §8 Gate 3, §6.2
- `state/task-context/DEV1-010.md`
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

- HTTP implementations of `GroupClient` and `MemberSetupClient` behind the existing interfaces, selectable by config.
- Error-schema handling and retry-safe requests (idempotency per backend contract).
- Invite join works against the real backend.
- Mock clients retained for tests.

## Critical correctness constraints

- Never display or mock other members' private availability or raw preference history.
- No client-side voting, fairness, or planner scoring rules; do not guess SPEC §11 items.
- Mobile keeps displaying authoritative backend state; no local source of truth for group/membership.
- No private data of other members requested or displayed.

## Acceptance criteria

- Preferences persist through API integration.
- Group create/join works across two devices/sessions.

## Required tests

- Contract round-trip tests against fixtures; manual two-device smoke.

## Handoff

Commit `DEV1-010:` on `agent/DEV1-010-real-api-groups-setup`, set status `candidate`, no merge. Report files changed, commands run (`pnpm --filter @gather/contracts build`, `pnpm --filter @gather/mobile typecheck`, `pnpm --filter @gather/mobile test`), results, limitations, what is not wired yet, and any SPEC §9 contract change requests.
