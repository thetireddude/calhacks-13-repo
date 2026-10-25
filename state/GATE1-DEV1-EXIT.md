# GATE1-DEV1-EXIT — checklist and evidence

**Task:** DEV1-008
**Last verified:** contracts build, mobile typecheck, lint, test — **10 suites / 167 tests pass**
**Contracts consumed:** `CONTRACTS_VERSION` = `0.1.1-stub` (unchanged on main and DEV2 branches at the time of this task)
**Device status:** nothing has been run on a physical device or simulator.

Summary and the contract change request table: [`docs/gate1-dev1-exit.md`](../docs/gate1-dev1-exit.md).

## Checklist vs SPEC §8 Gate 1 (Developer 1)

- [x] **Screens and navigation** (mock-only) — `apps/mobile/src/RootNavigator.tsx`; tests in `RootNavigator.test.tsx` ("signed-out user sees the email screen and no authenticated screens", "sign-in reaches authenticated tabs and logout returns to the email screen").
- [x] **API-mocked onboarding** (mock-only) — auth, groups, member setup; see rows below.
- [~] **API-mocked planning** — runs and proposals render; aggregate attendance and inclusion-aware alternative **not met — contract gap**.
- [x] **API-mocked voting** (mock-only; stubs for missing DTOs).
- [x] **API-mocked confirmation** (mock-only).
- [x] **Builds/tests independently** — command below passes.
- [ ] **CI covers mobile** — not covered (integration-owner action).

## Checklist vs SPEC §3 acceptance tests (Developer 1)

| SPEC §3 acceptance test | Status | Evidence / note |
|-------------------------|--------|-----------------|
| OTP login can complete on a physical demo device | **UNVERIFIED** — mock-only | Mock `AuthClient` in `auth.tsx` (any non-empty code signs in). Jest: `auth.test.ts`, `RootNavigator.test.tsx` ("invalid code shows its own error…", "expired code shows a distinct error and resend recovers", "network failure on verify is recoverable"). Real Supabase OTP is DEV1-009 (Gate 3). No device run. |
| Group creation/joining UI works | **Met against mocks** | `groupScreens.test.tsx`: "create group opens its dashboard…", "join by pasted token adds the group…", "invalid invite token shows an error…", "opening an invite deep link joins the group", "multiple groups are kept in navigation state…". `gather://` scheme (`app.json`) unverified on device. Not integrated until Gate 3. |
| Preferences persist through API integration | **Not integrated until Gate 3** | Only a mock `MemberSetupClient` (`memberSetup.ts`). `memberSetupScreens.test.tsx`: "preferences save, reload, and learning toggle is shown accurately" proves mock round trip only, not API persistence. |
| Denying push permission does not block onboarding | **Met against mocks; Expo path UNVERIFIED** | `memberSetupScreens.test.tsx`: "denied push permission shows a fallback notice and setup stays usable", "a throwing permission request is treated as denied"; `votingScreens.test.tsx`: "notification feed renders with push permission denied and no registration". Real `expo-notifications` call (`notifications.ts`) not run on a device; Expo Go on Android restricts notifications. |
| Proposals display correctly | **Partially met (mock-only)** | `planningScreens.test.tsx`: "three proposals render in backend order…", "more than three proposals are capped at three", "pending run…", "failed run is recoverable…". Aggregate attendance and inclusion-aware alternative: **not met — contract gap** (item d). |
| Voting and veto states render accurately | **Met against mock stub types** | `votingScreens.test.tsx`: "open voting shows deadline, aggregate counts, vote and separate veto controls", "veto control is hidden when the backend does not allow it", "veto and Can't make it are distinct controls…"; `votingAdversarial.test.tsx`, `votingRepair.test.tsx`. State shape is a mobile-local stub (item e1). "Suggest another" absent from contract, shown disabled (item e5). |
| Confirmed events are accessible to declining members | **Met against mocks** | `votingScreens.test.tsx`: "a member who voted Can't make it can still open the confirmed event", "cancelled event shows cancellation and no calendar export". Not integrated until Gate 3. |
| ICS export works on the demo device | **UNVERIFIED — mock-only** | `IcsClient` stub (`voting.ts`) produces no file; UI says "not connected yet (stub)". Test "confirmed event shows summary and exports ICS through the IcsClient" only checks the stub call. ICS owner/format is SPEC §11 (item e4). |
| No protected personal data is displayed | **Met against mocks** | Privacy tests: `groupScreens.test.tsx` ("privacy: rendered group screens never show availability or preference data"), `memberSetupScreens.test.tsx` ("privacy: setup screens render the owner's own data…"), `planningScreens.test.tsx` ("privacy: private-looking fields and scores are never rendered…"), `votingScreens.test.tsx` ("only aggregate counts are rendered…"). Mock-only: backend guarantees are unverified until integration. |

## Commands run

Run in the DEV1-008 worktree after `pnpm install --frozen-lockfile` (clean):

```bash
pnpm --filter @gather/contracts build && pnpm --filter @gather/mobile typecheck && pnpm --filter @gather/mobile lint && pnpm --filter @gather/mobile test
```

Results: contracts build ok; typecheck ok; lint ok; **Test Suites: 10 passed, 10 total; Tests: 167 passed, 167 total**.

Test files: `RootNavigator.test.tsx`, `auth.test.ts`, `groupScreens.test.tsx`, `groups.test.ts`, `memberSetup.test.ts`, `memberSetupScreens.test.tsx`, `planningScreens.test.tsx`, `votingScreens.test.tsx`, `votingAdversarial.test.tsx`, `votingRepair.test.tsx`.

## Integration-owner action items

- Root `typecheck` (filters only `@gather/contracts` and `@gather/api`) and CI do not cover mobile. Add the command above or a `test:dev1` script.
- Lockfile includes `expo-notifications` and `@react-navigation/*` (added during DEV1-001..007).

## Contract change requests, known limitations, blocked tasks

See [`docs/gate1-dev1-exit.md`](../docs/gate1-dev1-exit.md): table of SPEC §9 requests (items a-e6 with the mobile-local stub each replaces), deferred reviewer P3s, and the "Not ready to start" section (DEV1-009..012 blocked on Gate 2, no `GATE2-EXIT` task defined, contract freeze items; no SPEC §11 item guessed).
