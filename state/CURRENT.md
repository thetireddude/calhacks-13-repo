# Current Project State — Developer 2 (Core API)

## Milestone

**Lane branch:** `dev-2` (all Dev 2 work through DEV2-018). **Catch-up in flight:** DEV2-019 ∥ DEV2-020.

## In flight

| Task | Deliverable |
|------|-------------|
| DEV2-019 | `GET /v1/groups` (membership-scoped) |
| DEV2-020 | `PUT /v1/me` displayName |

## Shipped (Gate 1)

DEV2-001–010 on `main`. See [`state/GATE1-DEV2-EXIT.md`](GATE1-DEV2-EXIT.md).

## Tests

`pnpm run test:ci` — **37/37** (Tester gates must use this command).

## Blockers (SPEC §11)

Voting rules, scheduler, full DTO freeze — stub until approved.

## Waiting on others (Gate 2+)

- **Dev 3** — real `@gather/planner` for non-mock planning.
- **Dev 1** — Gate 3 mobile ↔ API.
