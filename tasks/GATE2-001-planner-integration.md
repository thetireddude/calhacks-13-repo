# GATE2-001 — Wire @gather/planner into apps/api

## Status

candidate — cross-lane (Dev 2 API, Dev 3 planner) at user request; needs Dev 2 / Dev 3 review per SPEC §9.

## Goal

Backend creates and stores proposals from the real `@gather/planner` (SPEC §8 Gate 2), behind `PLANNER_IMPL=real`; default stays the mock so CI is deterministic.

## Scope

- `apps/api/src/planner/createPlannerPort.ts`: `createDefaultPlannerPort(env)`; `app.ts` default, `options.plannerPort` injection kept.
- `apps/api/src/planning/orchestrate.ts`: `validatePlannerResult` before persistence.
- `apps/api/src/planner-integration.test.ts`.
- `apps/api/package.json` dependency; root `test:ci` / `typecheck` build the planner first (root config: integration owner to confirm); `.env.example` gets `PLANNER_IMPL=`.
- Not touched: `packages/planner/**`, `packages/contracts/**`, `supabase/**`, mobile.

## Validation behavior

Run id must match; `proposals` must be an array; at most 3 are kept (extras beyond the third are truncated, pre-existing behavior); 1..3 required. Each item needs a non-empty `proposalId` and `summary`, an integer `rank >= 1`, unique ids and ranks, a finite `deterministicScore` if present, and an `explanation` that passes the planner's `isPublicExplanationSafe`. Any violation or thrown error: `markRunFailed`, nothing persisted, `POST /v1/planning-runs/:id/generate` retries. Unsafe explanation fails the run (not field-dropping).

## Gaps / requests

- Routes pass only `groupId`, `activityRequest`, `planningRunId`; `memberContext` is not populated, so member preferences/availability and `learningOptIn` handling are not used by the planner yet (nothing private can leak, but ranking ignores members). Dev 2/3 to define the authorized context assembly.
- Real planner returns no `deterministicScore` and does not use `activityRequest` or group data.
- Planner returns `generatedAt`; backend does not store it.

## Evidence

`state/GATE2-EXIT.md`.
