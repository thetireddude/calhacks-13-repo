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

# Developer 1 (Mobile)

**DEV1-001..011 and DEV1-013 complete or partial; DEV1-012 ready for a device run.** `apps/mobile` signs in with Supabase email + password (ADR-003; OTP flow remains in git history) and uses real HTTP clients for groups, invites, members, preferences, availability, planning runs/proposals, vote, veto and the confirmed event. The UI follows the Gather design system (light/dark). Evidence: [`docs/gate1-dev1-exit.md`](../docs/gate1-dev1-exit.md), [`docs/demo-mobile.md`](../docs/demo-mobile.md), [`docs/dev1-contract-requests.md`](../docs/dev1-contract-requests.md).

- Mobile verification: contracts build, typecheck, lint, test — 16 suites / 281 tests pass. Contract-fit runs against the real in-memory API passed for groups/setup (41 checks) and planning/voting (36 of 37; the one note is a design consequence of the 404 mapping).
- Still mock or unavailable (no API route): weekly schedule, vote tally/state, notifications feed, ICS export, push-device registration.
- Not verified: live Supabase-backed run, `/v1/me` with a real session token, two-device smoke, visual check on a phone.
- Integration-owner actions: CI runs only root `typecheck` and `test:ci`, so mobile and planner tests are not covered; add `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_URL` to `.env.example`; lockfile gained `@supabase/supabase-js`, `expo-secure-store`, `expo-font`, `@expo-google-fonts/*`.
- ADR-003 (email + password for the demo) is Proposed and needs Dev 2 / Dev 3 acknowledgment.

## Waiting on others (Gate 2+)

- **Dev 3** — real `@gather/planner` for non-mock planning.
- **Dev 1** — Gate 3 mobile ↔ API.
