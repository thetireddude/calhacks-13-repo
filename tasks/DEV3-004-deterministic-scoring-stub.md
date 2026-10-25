# DEV3-004 — Deterministic scoring stub (approved weights)

## Status

candidate

## Dependencies

- DEV3-003

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Worktree required: yes  
Developer lane: planner

## Goal

Add a small scoring module in `packages/planner` that exports **fixed approved weights** (45% / 30% / 15% / 10%) and computes `deterministicScore` as a weighted sum of **explicit stub dimension scores** supplied in tests or via optional fields on `PlannerInput.memberContext` (e.g. `scoringStub` object in tests only). Wire into `createPlanner()` so seeded/discovery proposals get non-zero scores when stub dimensions provided.

## Read first

- `AGENTS.md`, `SPEC.md` §5 deterministic scoring, `docs/developers/developer-3-planner.md`
- `packages/planner/src/createPlanner.ts`, `seededCandidateActivities.ts`

## Allowed files

- `packages/planner/**`

## Do not modify

- `apps/api/**`, `apps/mobile/**`, `supabase/**`
- Do not change `packages/contracts` unless task blocked — prefer planner-local types for stub dimensions

## Critical correctness constraints

- Weights must match SPEC exactly; must sum to 1.
- Do **not** implement SPEC §11 unresolved formulas (attendance inference, inclusion decay, normalization across groups).
- Do not read or simulate private member preference history for scoring.
- AI/explanation text must remain privacy-safe.

## Acceptance criteria

- Unit tests: weight constants; weighted sum math; stable ordering when scores differ; ≤3 proposals still enforced.
- `pnpm --filter @gather/planner run test` passes.

## Handoff

Commit prefix `DEV3-004:`; status `candidate`; no merge to main.
