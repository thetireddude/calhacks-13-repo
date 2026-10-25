# Current Project State — Developer 2 (Core API)

## Milestone

**Lane branch:** `dev-2` / `main` through DEV2-020. **Stub wave in flight:** DEV2-021–025.

## In flight

| Task | Deliverable |
|------|-------------|
| DEV2-021 | Group schedule GET/PUT (no auto-run) |
| DEV2-022 | ICS export for confirmed events |
| DEV2-023 | `GET /v1/me/notifications` feed stub |
| DEV2-024 | Dev 1 API handoff doc |
| DEV2-025 | Demo seed notes |

## Shipped (Gate 1)

DEV2-001–010 on `main`. See [`state/GATE1-DEV2-EXIT.md`](GATE1-DEV2-EXIT.md).

## Tests

`pnpm run test:ci` — **42/42** (Tester gates must use this command).

## Blockers (SPEC §11)

Voting rules, scheduler, full DTO freeze — stub until approved.

# Developer 1 (Mobile)

**Gate 1 Developer 1 — complete (DEV1-001..008), mock-only.** `apps/mobile` has screens, navigation, and mock-backed onboarding, planning, voting, confirmation. Nothing runs against a real API or on a physical device. Evidence: [`state/GATE1-DEV1-EXIT.md`](GATE1-DEV1-EXIT.md), [`docs/gate1-dev1-exit.md`](../docs/gate1-dev1-exit.md).

- Mobile verification: contracts build, typecheck, lint, test — 10 suites / 167 tests pass (contracts `0.1.1-stub`).
- Not met (contract gap): aggregate attendance, inclusion-aware alternative, "Suggest another". SPEC §9 change requests are listed in the exit doc.
- Integration-owner action: CI runs only root `typecheck` (contracts + api) and `test:dev2`, so mobile is not covered.
- Blocked: DEV1-009..012 need Gate 2 (no `GATE2-EXIT` task defined) and the contract freeze items.

## Waiting on others (Gate 2+)

- **Dev 3** — real `@gather/planner` for non-mock planning.
- **Dev 1** — Gate 3 mobile ↔ API.
