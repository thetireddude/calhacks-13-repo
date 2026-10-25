# DEV3-003 — Compose the approved planner behind `PlannerPort`

## Status

backlog

## Dependencies

- DEV3-002

## Execution

Primary role: implementer

Review required: yes

Tester required: yes

Worktree required: yes

Developer lane: planner

## Goal

Make `createPlanner().generatePlans` compose authorized input preparation, candidate discovery with fallback, ADR-002 deterministic scoring, tie behavior, and privacy-safe explanations into a validated `PlannerResult`.

## Read first

- `AGENTS.md`
- `docs/project-dag.md`
- `SPEC.md` §5, §6.3, §10
- `docs/decisions/ADR-002-planner-rules.md`
- accepted DEV3-002 contract decision
- `packages/planner/src/index.ts`

## Allowed files

- `packages/planner/**`

## Do not modify

- `apps/api/**`, `apps/mobile/**`, `supabase/**`, `packages/contracts/**` unless DEV3-002 explicitly approved it

## Requirements

- Return at most three ranked proposals from the public planner entry point.
- Use only ADR-002 eligibility, component formulas, weights, and exact-tie result.
- Use seeded candidates after a live-source failure; do not silently invent candidate data.
- Validate provider/discovery outputs before ranking and keep provider-specific types internal.
- Produce only aggregate, privacy-safe explanations.
- Never persist or mutate votes, events, memberships, or inclusion debt.

## Acceptance criteria

- Frozen fixtures produce reproducible proposal order/scores.
- A provider/discovery failure yields documented safe fallback or recoverable error.
- Planner output validates against the accepted `PlannerResult` contract.
- No private input is observable in public proposals or explanations.

## Required tests

- Deterministic end-to-end fixture through `PlannerPort`.
- Exact-tie fixture.
- Fallback and malformed provider/discovery fixture.
- Privacy regression fixture.

## Handoff

Report public API behavior, fixtures added, provider configuration deferred to DEV3-004/005, and readiness for GATE2-001.
