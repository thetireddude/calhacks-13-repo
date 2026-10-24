# DEV3-001 — Planner package bootstrap

## Status

blocked

## Dependencies

- GATE0-001
- GATE0-002 (for port types; may start with local interfaces then align)

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Worktree required: yes  
Developer lane: planner

## Goal

Initialize importable `packages/planner` on `feature/planner` exporting `PlannerPort` implementation stub that returns empty or fixture proposals for backend integration tests.

## Read first

- `docs/developers/developer-3-planner.md`
- `SPEC.md` §5, §6.3

## Allowed files

- `packages/planner/**`

## Do not modify

- `apps/api/**`, `supabase/**`, `apps/mobile/**`

## Acceptance criteria

- Package builds and exports `createPlanner()` or equivalent factory returning `PlannerPort`.
- Stub `generatePlans` validates input shape and returns ≤3 proposals.
- README documents seeded discovery path for Gate 1.

## Required tests

- Fixture input → deterministic stub output count and schema.

## Notes

Unblocked when GATE0-001 completes; align types with GATE0-002 before merge to integration branch.
