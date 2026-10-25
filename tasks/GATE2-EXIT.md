# GATE2-EXIT — Gate 2 exit (planner integration)

## Status

draft — proposed by the mobile lane for orchestrator review; not approved, not scheduled.

## Dependencies

- DEV2-010 (Gate 1 Dev 2 exit)
- DEV3 Gate 1 exit (importable planner package, seeded discovery)
- DEV1-008 (Gate 1 mobile exit)

## Execution

Primary role: orchestrator (integration owner for merge)
Review required: yes
Tester required: yes
Worktree required: yes
Developer lane: cross-lane (Dev 2 + Dev 3; Dev 1 consumes)
Gate: Gate 2

## Goal

Close SPEC §8 Gate 2 so DEV1-009..012 can be unblocked: the backend creates and stores proposals from the imported planner, and the contract items mobile depends on are decided.

## Gate 2 exit condition (SPEC §8)

Backend creates and stores proposals from the imported `@gather/planner`, with:

- planner package merged into the integration base and imported by `apps/api` through its public entry point only,
- real planner output validated against the backend schema,
- persistence and privacy behavior verified (no private availability or raw preference history in responses),
- provider-failure paths tested; failed planning runs recoverable.

## Mobile-lane inputs (SPEC §9 change requests)

Full detail and mobile-local stubs: [`docs/gate1-dev1-exit.md`](../docs/gate1-dev1-exit.md), "Contract change requests". Dev 2 owns `packages/contracts/**`; each item needs agreement from Dev 1, Dev 2 and Dev 3 before Dev 2 changes it.

| Needed before | Item (request ID) | Owner of decision |
|---------------|-------------------|-------------------|
| DEV1-010 | Frozen error response schema (a) | Dev 2 |
| DEV1-010 | Group list route / display name / roles / invite expiry (b) — `GET /v1/groups` and a display-name field have landed on `main` (DEV2-019/020); confirm they satisfy (b) | Dev 2 |
| DEV1-010 | Weekly schedule DTO; availability window and budget currency formats (c) | Dev 2 + SPEC §11 |
| DEV1-011 | Aggregate attendance and inclusion-aware alternative on `Proposal`; planning-run status enum incl. `failed`; retry semantics (d) | Dev 2 + Dev 3 |
| DEV1-011 | Vote-state/tally DTO and route; deadline; revision state; veto/vote-allowed flags (e1) | Dev 2 + SPEC §11 voting |
| DEV1-011 | Confirmed-event status and no-event response (e2); notification DTO (e3) | Dev 2 |
| DEV1-011 | ICS serialization owner and format (e4); push-device DTO (e6) | SPEC §11 |
| DEV1-011 | "Suggest another" vote choice (e5) — or an explicit decision to drop it | Orchestrator |

## Open SPEC §11 items that remain stubbed after Gate 2

Gate 2 does not require resolving these; mobile keeps rendering backend state only: voting rules (veto scope, majority denominator, deadlines, revisions), fairness formulas, scheduler, push delivery details, QR/invite details.

## Integration-owner actions

- Assign the integration owner (SPEC §11) and confirm lockfile ownership.
- Add `pnpm --filter @gather/mobile typecheck` and `test` to CI; mobile is not covered today.
- Add `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_URL` to `.env.example` (introduced by DEV1-009).

## Acceptance criteria

- Gate 2 exit condition above is demonstrated with evidence (test run plus a stored-proposals check).
- Each row in the mobile-inputs table is marked decided (with contract version or ADR) or explicitly deferred.
- `tasks/index.md` and `state/CURRENT.md` updated; DEV1-009..012 status changed from `blocked` as appropriate.

## Required tests

- API ↔ planner integration test using real `@gather/planner` output.
- Privacy test: forbidden fields absent from proposal responses.
- Provider-failure and failed-run recovery tests.
- Contract round-trip tests for any DTO added or changed.

## Handoff

Orchestrator records evidence in `state/GATE2-EXIT.md`. No merge without reviewer and tester gates.
