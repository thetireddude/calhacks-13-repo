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

Run id must match; `proposals` must be an array of 1..10 items, every item validated; a valid result with more than 3 keeps only the top three by rank (existing Dev 2 behavior); more than 10 fails the run closed. Each item needs a `proposalId` (non-empty, <=200 chars), `summary` (non-empty, <=300), an integer `rank`; ids unique; ranks exactly the set {1..n} (gaps, duplicates, rank 0 rejected; contiguous out-of-order ranks are sorted and persisted in rank order); finite `deterministicScore` if present; `explanation` if present must be non-empty, <=600 chars; `revisionId` if present a string <=200. `isPublicExplanationSafe` is applied to both `summary` and `explanation`. An empty-string explanation is invalid (not treated as absent). Any violation, thrown error or timeout: `markRunFailed`, nothing persisted, `POST /v1/planning-runs/:id/generate` retries. Violations fail the run rather than dropping fields.

The existing test `planning.test.ts` "mock planner persists at most three proposals" (5 proposals in, 3 persisted) is unchanged: truncation to the top three is Dev 2's pinned behavior. Earlier drafts of this task changed that test after a review claimed no test required truncation; that claim was wrong and the change was reverted. What changed instead: every item is validated before truncating, so a bad fourth item or a rank gap fails the run.

Privacy: `isPublicExplanationSafe` is a BEST-EFFORT substring filter, NOT a privacy guarantee. It misses emails, phone numbers, addresses and phrasing like "free on Friday", and can false-positive on words like "history". The real guarantee today is that no member context is passed to the planner.

Operational behavior: planner call timeout (default 20000 ms, `PLANNER_TIMEOUT_MS` or `createApp({plannerTimeoutMs})`); a late result after timeout is ignored. Failures log one line (`[planner] run=<id> <code>`, codes `invalid_output:<reason>`, `planner_error:<ErrorClassName>`, `planner_timeout`, `persist_error:<ErrorClassName>`), never messages, payloads or proposal text. A per-run in-process in-flight guard makes a concurrent `/generate` return 409 `generation_in_progress` without calling the planner; it is per-process only. Cross-process atomicity (conditional claim update; Postgres RPC doing delete+insert+status in one transaction) is Dev 2's surface and remains an open request. `PLANNER_IMPL` is trimmed/lower-cased; `real` and `mock` accepted; other non-empty values warn once and use the mock.

Build order: the API imports `@gather/planner`, so `pnpm --filter @gather/planner build` is needed before `dev`/`start`/tests (`pnpm run test:ci` does it).

## Gaps / requests

- Routes pass only `groupId`, `activityRequest`, `planningRunId`; `memberContext` is not populated, so member preferences/availability and `learningOptIn` handling are not used by the planner yet (nothing private can leak, but ranking ignores members). Dev 2/3 to define the authorized context assembly.
- Real planner returns no `deterministicScore` and does not use `activityRequest` or group data.
- Planner returns `generatedAt`; backend does not store it.

## Evidence

`state/GATE2-EXIT.md`.
