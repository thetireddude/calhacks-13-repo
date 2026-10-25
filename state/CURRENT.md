# Current Project State — Developer 2 (Core API)

## Milestone

**Gate 1 complete** (merged PR #1). **Gate 2 prep merged:** DEV2-011–013. **Persistence wave in flight:** DEV2-014 ∥ DEV2-015; DEV2-016 → DEV2-017 queued.

## In flight

| Task | Deliverable |
|------|-------------|
| DEV2-014 | Env-gated `profiles` for `GET /v1/me` |
| DEV2-015 | Env-gated prefs + availability |
| DEV2-016 | queued — planning runs + proposals (after 014+015) |
| DEV2-017 | queued — votes / vetoes / confirmed events (after 016) |

## Shipped (Gate 1)

DEV2-001–010 on `main`. See [`state/GATE1-DEV2-EXIT.md`](GATE1-DEV2-EXIT.md).

## Tests

`pnpm run test:ci` — **29/29** (Tester gates must use this command).

## Blockers (SPEC §11)

Voting rules, scheduler, full DTO freeze — stub until approved.

## Waiting on others (Gate 2+)

- **Dev 3** — real `@gather/planner` for non-mock planning.
- **Dev 1** — Gate 3 mobile ↔ API.
