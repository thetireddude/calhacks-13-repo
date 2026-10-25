# DEV1-004 — Groups UI with mock group client

## Status

candidate

## Dependencies

- DEV1-003

## Execution

Primary role: implementer  
Review required: yes  
Tester required: no  
Worktree required: yes  
Developer lane: mobile  
Gate: Gate 1

## Goal

Create group, join via invitation link, member list, and group dashboard using a DTO-aligned mock group client.

## Read first

- `AGENTS.md`
- `docs/project-dag.md`
- `state/CURRENT.md`
- `docs/developers/developer-1-mobile.md`
- `SPEC.md` — SPEC §3 Group management, §6.2 groups/invites/members routes
- `state/task-context/DEV1-004.md`
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

- `GroupClient` interface + mock typed with `CreateGroupRequest`, `GroupResponse`, `GroupInviteResponse`, `GroupMemberResponse`, `JoinInviteResponse` from `@gather/contracts`.
- Create group screen; generate/share invite; join-by-invite-link deep link handler (token only; QR is SPEC §11, out of scope).
- Member list shows only group-visible fields from `GroupMemberResponse`.
- Group dashboard shell with entry points to planning, confirmed event, notifications.
- Multiple groups per user supported in navigation state.

## Critical correctness constraints

- Never display or mock other members' private availability or raw preference history.
- No client-side voting, fairness, or planner scoring rules; do not guess SPEC §11 items.
- Mock payloads contain no private availability or preference data.
- Route shapes mirror SPEC §6.2; do not invent extra routes or fields.
- Final invitation/QR implementation details are SPEC §11: link join only.

## Acceptance criteria

- Create and join flows work against mocks and update dashboard/member list.
- Mock fixtures type-check against contracts.

## Required tests

- Mock client unit tests; create/join/member-list screen tests; privacy test (no forbidden fields in fixtures/render).

## Handoff

Commit `DEV1-004:` on `agent/DEV1-004-groups-ui-mock`, set status `candidate`, no merge. Report files changed, commands run (`pnpm --filter @gather/contracts build`, `pnpm --filter @gather/mobile typecheck`, `pnpm --filter @gather/mobile test`), results, limitations, what is not wired yet, and any SPEC §9 contract change requests.
