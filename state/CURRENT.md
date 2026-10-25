# Current Project State — Developer 2 (Core API)

## Milestone

**Gate 1 complete.** **Gate 2 persistence complete** (011–017). **Catch-up in flight:** DEV2-018 ∥ 019 ∥ 020 (env/CORS, list groups, displayName).

## In flight

| Task | Deliverable |
|------|-------------|
| DEV2-018 | Load `.env` on `dev` + CORS |
| DEV2-019 | `GET /v1/groups` (membership-scoped) |
| DEV2-020 | `PUT /v1/me` displayName |

## Shipped (Gate 1)

DEV2-001–010 on `main`. See [`state/GATE1-DEV2-EXIT.md`](GATE1-DEV2-EXIT.md).

## Tests

`pnpm run test:ci` — **35/35** (Tester gates must use this command).

## Blockers (SPEC §11)

Voting rules, scheduler, full DTO freeze — stub until approved.

## Waiting on others (Gate 2+)

- **Dev 3** — real `@gather/planner` for non-mock planning.
- **Dev 1** — Gate 3 mobile ↔ API.
