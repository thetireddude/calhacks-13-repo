# DEV3-002 — Planner contract proposal and consumer sign-off

## Status

backlog

## Dependencies

- DEV3-001

## Execution

Primary role: implementer

Review required: yes

Tester required: yes

Worktree required: yes

Developer lane: planner

## Goal

Produce an approved, privacy-safe proposal for the `PlannerPort` input/result required by the real planner, and obtain Dev 1 and Dev 2 consumer agreement before any shared-contract change.

## Read first

- `AGENTS.md`
- `docs/project-dag.md`
- `SPEC.md` §5, §6.1, §6.3, §9, §10
- `docs/decisions/ADR-002-planner-rules.md`
- `packages/contracts/src/planner.ts`
- `packages/planner/src/domain.ts`

## Allowed files

- `docs/decisions/**` or a new planner-contract proposal document
- `packages/planner/**` only for contract-adaptation tests
- `state/task-context/DEV3-002.md`

## May modify if necessary

- `packages/contracts/**` only after recorded Developer 1 and Developer 2 approval

## Do not modify

- `apps/api/**`, `apps/mobile/**`, `supabase/**`
- scoring/provider implementation unrelated to contract adaptation

## Requirements

- Define only ADR-002-authorized fields: opaque member reference, tags, candidate availability, budget, travel radius, opted-in inclusion debt, candidates, ranked proposals, and proposed ledger updates/tie outcome.
- Explicitly exclude name, email, raw calendar data, raw preference history, private event details, and opted-out history.
- Record consumer sign-off before changing `@gather/contracts`.
- Specify schema validation and DTO round-trip fixtures.

## Acceptance criteria

- Approved ADR/proposal names field ownership and visibility.
- Dev 1 and Dev 2 sign-off is recorded.
- Any accepted shared-contract change is additive or versioned and has contract tests.

## Required tests

- Planner input/output schema validation and contract round-trip fixtures.
- Privacy fixtures proving forbidden fields are rejected or absent.

## Handoff

Link the approval record, state contract version impact, and identify the exact API integration dependency for GATE2-001.
