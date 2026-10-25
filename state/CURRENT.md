# Current Project State — Developer 2 (Core API)

## Milestone

**Gate 1 complete** (merged PR #1). **Gate 2 prep in flight:** DEV2-011 ∥ DEV2-012 ∥ DEV2-013.

## In flight

| Task | Deliverable |
|------|-------------|
| DEV2-011 | Supabase-backed groups when env set; in-memory default for CI |
| DEV2-012 | Optional Supabase JWT iss/aud validation |
| DEV2-013 | Local Dev 2 runbook + `.env.example` |

## Shipped (Gate 1)

DEV2-001–010 on `main`. See [`state/GATE1-DEV2-EXIT.md`](GATE1-DEV2-EXIT.md).

## Tests

`pnpm run test:ci` — **27/27** (Tester gates must use this command).

## Blockers (SPEC §11)

Voting rules, scheduler, full DTO freeze — stub until approved.

## Waiting on others (Gate 2+)

- **Dev 3** — real `@gather/planner` for non-mock planning.
- **Dev 1** — Gate 3 mobile ↔ API.
