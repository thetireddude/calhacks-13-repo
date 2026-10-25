# DEV1-005 — Member setup UI

## Status

ready

## Dependencies

- DEV1-004

## Execution

Primary role: implementer  
Review required: yes  
Tester required: no  
Worktree required: yes  
Developer lane: mobile  
Gate: Gate 1

## Goal

Preferences, budget, travel radius, manual availability, learning opt-in/out, notification permission request, and weekly planning settings UI.

## Read first

- `AGENTS.md`
- `docs/project-dag.md`
- `state/CURRENT.md`
- `docs/developers/developer-1-mobile.md`
- `SPEC.md` — SPEC §3 Member setup, §6.2 `/v1/me/preferences`, `/v1/me/availability`, `/v1/groups/:id/schedule`
- `state/task-context/DEV1-005.md`
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

- Mock `MemberSetupClient` typed with `MemberPreferencesResponse`, `PutMemberPreferencesRequest`, `MemberAvailabilityResponse`, `PutMemberAvailabilityRequest`, `AvailabilityWindow`.
- Screens: activity preferences, budget range, travel radius, manual availability editor, learning opt-in/out toggle.
- Notification permission request via Expo; denial is handled and onboarding continues (in-app feed remains).
- Weekly planning settings UI (weekday, time, voting deadline) against a mobile-local mock; schedule DTO and timezone representation are SPEC §11 / not in contracts yet — record a contract request, do not guess.

## Critical correctness constraints

- Never display or mock other members' private availability or raw preference history.
- No client-side voting, fairness, or planner scoring rules; do not guess SPEC §11 items.
- Denying push permission must never block onboarding or app use.
- Budget/currency and availability formats follow contracts only; no ad hoc strings.
- Availability and preferences are shown only to their owner.
- Do not edit contracts; log missing schedule DTO as a SPEC §9 change request in the handoff.

## Acceptance criteria

- User can complete setup with push permission denied.
- Saved mock preferences/availability round-trip through the client typed by contracts.
- Learning opt-out toggle persists in mock and is displayed accurately.

## Required tests

- Mock client round-trip tests; permission-denied flow test; form validation tests.

## Handoff

Commit `DEV1-005:` on `agent/DEV1-005-member-setup-ui`, set status `candidate`, no merge. Report files changed, commands run (`pnpm --filter @gather/contracts build`, `pnpm --filter @gather/mobile typecheck`, `pnpm --filter @gather/mobile test`), results, limitations, what is not wired yet, and any SPEC §9 contract change requests.
