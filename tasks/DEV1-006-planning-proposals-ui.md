# DEV1-006 — Planning and proposals UI

## Status

candidate

## Dependencies

- DEV1-005

## Execution

Primary role: implementer  
Review required: yes  
Tester required: no  
Worktree required: yes  
Developer lane: mobile  
Gate: Gate 1

## Goal

Manual planning initiation, natural-language request, run status, and up-to-three ranked proposals with explanations and aggregate attendance.

## Read first

- `AGENTS.md`
- `docs/project-dag.md`
- `state/CURRENT.md`
- `docs/developers/developer-1-mobile.md`
- `SPEC.md` — SPEC §3 Planning, §6.2 planning-runs routes
- `state/task-context/DEV1-006.md`
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

- Mock `PlanningClient` typed with `CreatePlanningRunRequest`, `PlanningRunResponse`, `PlanningRunProposalsResponse`, `Proposal`.
- Planning initiation screen with natural-language activity request input.
- Run status/progress view covering all contract run states, including failed with retry affordance (retry semantics follow backend; do not invent).
- Proposal list (max 3) with rank, explanation text, aggregate attendance counts, and inclusion-aware alternative display, rendered from backend-provided fields only.
- Fixtures include failed and empty-result runs.

## Critical correctness constraints

- Never display or mock other members' private availability or raw preference history.
- No client-side voting, fairness, or planner scoring rules; do not guess SPEC §11 items.
- Mobile never computes rankings, scores, attendance, or fairness; it renders backend/planner output.
- Aggregate counts only; never show who is unavailable or any individual availability.
- Render at most three proposals even if a fixture contains more.
- No-feasible-plan and retry behavior are SPEC §11: neutral stub UI only.

## Acceptance criteria

- Proposals display in backend-provided order with explanations and aggregate counts.
- Failed run shows recoverable state.
- Privacy test passes (no private fields rendered).

## Required tests

- Component tests with fixtures (3 proposals, >3 proposals, failed run, empty); privacy rendering test.

## Handoff

Commit `DEV1-006:` on `agent/DEV1-006-planning-proposals-ui`, set status `candidate`, no merge. Report files changed, commands run (`pnpm --filter @gather/contracts build`, `pnpm --filter @gather/mobile typecheck`, `pnpm --filter @gather/mobile test`), results, limitations, what is not wired yet, and any SPEC §9 contract change requests.
