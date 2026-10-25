# DEV1-011 — Real API: planning, voting, events, notifications

## Status

backlog

## Dependencies

- DEV1-010

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Worktree required: yes  
Developer lane: mobile  
Gate: Gate 3

## Goal

Connect planning, voting/veto, confirmed event, ICS, notification feed, and push-device registration to the real backend.

## Read first

- `AGENTS.md`
- `docs/project-dag.md`
- `state/CURRENT.md`
- `docs/developers/developer-1-mobile.md`
- `SPEC.md` — SPEC §8 Gate 3, §6.2, §3 Voting/Confirmed events
- `state/task-context/DEV1-011.md`
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

- HTTP clients for planning runs/proposals, vote, veto, confirmed event, ICS download, notifications.
- Push-device registration after permission grant; skip silently when denied.
- Polling/refresh for planning run status (mechanism per backend; no invented realtime).
- ICS file save/share on device.

## Critical correctness constraints

- Never display or mock other members' private availability or raw preference history.
- No client-side voting, fairness, or planner scoring rules; do not guess SPEC §11 items.
- Blocked until contracts freeze notification payload, push-device, schedule, and ICS delivery (SPEC §6.4).
- UI continues to render backend voting/confirmation state only.

## Acceptance criteria

- Users can initiate planning and vote on physical phones (Gate 3 exit).
- Declining members can open the confirmed event.
- Push denied still yields a working in-app feed.

## Required tests

- Integration smoke across two sessions; contract tests for new DTOs.

## Handoff

Commit `DEV1-011:` on `agent/DEV1-011-real-api-planning-voting`, set status `candidate`, no merge. Report files changed, commands run (`pnpm --filter @gather/contracts build`, `pnpm --filter @gather/mobile typecheck`, `pnpm --filter @gather/mobile test`), results, limitations, what is not wired yet, and any SPEC §9 contract change requests.
