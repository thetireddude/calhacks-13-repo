# Current Project State — Developer 2 (Core API)

## Milestone

**Lane branch:** `dev-2` (through DEV2-020). Catch-up batch **018–020 merged**. Nothing in flight.

## In flight

| Task | Deliverable |
|------|-------------|
| *(none)* | Waiting on Dev 3 planner / Dev 1 real API / SPEC §11 |

## Shipped (Gate 1)

DEV2-001–010 on `main`. See [`state/GATE1-DEV2-EXIT.md`](GATE1-DEV2-EXIT.md).

## Tests

`pnpm run test:ci` — **42/42** (Tester gates must use this command).

## Blockers (SPEC §11)

Voting rules, scheduler, full DTO freeze — stub until approved.

## Waiting on others (Gate 2+)

- **Dev 3** — real `@gather/planner` for non-mock planning.
- **Dev 1** — Gate 3 mobile ↔ API.
