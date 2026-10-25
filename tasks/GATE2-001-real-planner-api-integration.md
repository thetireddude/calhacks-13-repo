# GATE2-001 — Integrate the real planner with the Core API

## Status

backlog

## Dependencies

- DEV3-003
- DEV2-023

## Execution

Primary role: implementer

Review required: yes

Tester required: yes

Worktree required: yes

Developer lane: integration

## Goal

Replace the API mock planner with the reviewed public planner package while preserving authorization, privacy filtering, schema validation, recoverable persistence, and deterministic fixtures.

## Read first

- `AGENTS.md`
- `docs/project-dag.md`
- accepted DEV3-002 contract decision
- DEV3-003 handoff
- `apps/api/src/planning/orchestrate.ts`
- `packages/planner/src/index.ts`

## Allowed files

- `apps/api/src/planning/**`
- `apps/api/src/**.test.ts`
- `packages/planner/**` only for integration fixes approved by its owner
- `packages/contracts/**` only under the DEV3-002 agreement

## Requirements

- Construct only authorized, privacy-filtered planner input.
- Validate the real planner result before persistence; persist no more than three proposals.
- Planner failure leaves run state recoverable and creates no partial/corrupt proposals.
- Keep the API independent of Creao/Bright Data implementation types and credentials.

## Acceptance criteria

- Core API integration tests exercise real planner-package fixtures and failure paths.
- Auth/membership/privacy boundaries hold at the API-to-planner seam.
- Root `pnpm run test:ci` and planner tests pass on the candidate integration commit.

## Handoff

Record contract version, planner commit, test evidence, environmental dependencies, and whether DEV3-004/005 live verification remains optional for the seeded demo.
