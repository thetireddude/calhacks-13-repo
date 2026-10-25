# GATE0-002 — Shared contract type stubs

## Status

candidate

## Dependencies

- GATE0-001

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Worktree required: no  
Developer lane: core-api

## Goal

Add initial TypeScript types for `PlannerPort`, `PlannerInput`, `PlannerResult`, and core API DTO placeholders in `packages/contracts` for tri-lane review (SPEC §6.3–6.4).

## Read first

- `SPEC.md` §6
- `docs/developers/developer-2-backend.md`
- `docs/developers/developer-3-planner.md`

## Allowed files

- `packages/contracts/**`

## May modify if necessary

- Root workspace references to `packages/contracts`

## Do not modify

- `apps/api/**` routes, `apps/mobile/**`, `packages/planner/**` implementations

## Requirements

- Export documented `PlannerPort` with `generatePlans(input): Promise<PlannerResult>`.
- Mark unresolved fields with comments referencing SPEC §11 (no invented enums for voting/planning states without team approval).
- Version or `CONTRACTS_VERSION` constant for consumers.

## Acceptance criteria

- Developer 1 and 3 can import types from `@gather/contracts` (or chosen package name).
- Contract changes documented in task handoff for consumer review.
- Typecheck passes for contracts package.

## Required tests

- Minimal schema/type tests or zod/io-ts stubs if adopted in GATE0-001.
