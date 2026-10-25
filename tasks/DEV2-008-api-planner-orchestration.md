# DEV2-008 — API: mock planner orchestration

## Status

done

## Dependencies

- DEV2-007
- GATE0-002

## Goal

Wire a mock `PlannerPort` in the API, persist ≤3 proposals per planning run, recover from planner failures.

## Delivered

- `createMockPlannerPort()` in `apps/api/src/planner/`
- `generateAndPersistProposals` on create + `POST /v1/planning-runs/:runId/generate` retry
- Run statuses: `completed` / `failed`
