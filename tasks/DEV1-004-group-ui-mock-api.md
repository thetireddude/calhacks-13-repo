# DEV1-004 — Group UI with mock API client

## Status

implementing

## Dependencies

- DEV1-003
- DEV2-005 (contract shapes; mock client may mirror real routes)

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Worktree required: yes  
Developer lane: mobile

## Goal

Replace placeholder groups list with create/list/join flows using an in-app **mock API client** whose types align with `@gather/contracts` group DTOs (`CreateGroupRequest`, `GroupResponse`, etc.). No live backend required for Gate 1.

## Read first

- `AGENTS.md`, `state/CURRENT.md`, `docs/developers/developer-1-mobile.md`
- `packages/contracts/src/groups.ts`
- `apps/mobile/src/api/mockAuth.ts` (pattern)
- `apps/mobile/src/navigation/RootNavigator.tsx`

## Allowed files

- `apps/mobile/**`

## Do not modify

- `apps/api/**`, `supabase/**`, `packages/planner/**`, `packages/contracts/**` (import types only)

## Requirements

- After mock auth, user can create a group (name), see their groups list, and join via invite token (mock store).
- Mock client functions mirror SPEC §6.2 group routes at a high level (create, list, join).
- UI: extend `GroupsListScreen` and add minimal screens/modals as needed (create group, enter invite code).
- Session: use existing mock auth session user id for ownership display where useful.

## Critical correctness constraints

- Do not implement server-side voting or fairness rules on the client.
- Do not expose other users’ private data in UI copy.

## Acceptance criteria

- Typecheck passes for mobile package.
- Manual path: Welcome → auth → Groups shows user-created groups after create.
- Join flow adds membership in mock store and list updates.

## Required tests

- At least one focused unit test for mock group client (create + list + join) if mobile test harness exists; otherwise document manual test steps in handoff.

## Handoff

Commit on agent branch with prefix `DEV1-004:`; set task status `candidate`; do not merge to main.
