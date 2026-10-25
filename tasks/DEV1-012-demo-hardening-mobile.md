# DEV1-012 — Mobile demo hardening

## Status

blocked

## Dependencies

- DEV1-011

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Worktree required: yes  
Developer lane: mobile  
Gate: Gate 5

## Goal

Physical-device end-to-end pass, ICS export, notification-denial path, privacy sweep, and demo fallback for the mobile app.

## Read first

- `AGENTS.md`
- `docs/project-dag.md`
- `state/CURRENT.md`
- `docs/developers/developer-1-mobile.md`
- `SPEC.md` — SPEC §8 Gate 5, §10 Deployment/Privacy
- `state/task-context/DEV1-012.md`
- `packages/contracts/src/**` (consume only)

## Allowed files

- `apps/mobile/**`
- `docs/demo-mobile.md` (new)

## May modify if necessary

- none

## Do not modify

- `apps/api/**`, `supabase/**`, `packages/planner/**`
- `packages/contracts/**` (consume only; request changes via SPEC §9)
- Root workspace config (integration owner), except lockfile when adding a workspace dep and the task allows it

## Requirements

- Run the full journey on the selected physical phones; record results.
- Verify ICS export on the demo device and that no calendar is silently modified.
- Verify push-denied path and in-app feed.
- Sweep screens/logs/fixtures for protected personal data and secrets.
- Record a mobile demo fallback (script or recording notes).

## Critical correctness constraints

- Never display or mock other members' private availability or raw preference history.
- No client-side voting, fairness, or planner scoring rules; do not guess SPEC §11 items.
- No secrets in bundle or logs.
- Fixes limited to `apps/mobile/**`; cross-lane defects go back to the owning developer.

## Acceptance criteria

- Mobile acceptance tests in SPEC §3 all pass on device.
- Privacy sweep finds no exposed private data.

## Required tests

- Device checklist; automated suite still green.

## Handoff

Commit `DEV1-012:` on `agent/DEV1-012-demo-hardening-mobile`, set status `candidate`, no merge. Report files changed, commands run (`pnpm --filter @gather/contracts build`, `pnpm --filter @gather/mobile typecheck`, `pnpm --filter @gather/mobile test`), results, limitations, what is not wired yet, and any SPEC §9 contract change requests.
