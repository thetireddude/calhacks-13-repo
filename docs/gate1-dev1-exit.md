# Gate 1 exit — Developer 1 (Mobile)

**SPEC reference:** §8 Gate 1 — Independent vertical components (Developer 1 bullets), §3 Acceptance tests
**Task:** DEV1-008
**Branch:** `feature/mobile` / `agent/DEV1-008-gate1-exit-mobile`
**Detailed checklist and evidence:** [`state/GATE1-DEV1-EXIT.md`](../state/GATE1-DEV1-EXIT.md)

## Summary

The mobile lane delivers screens, navigation, and mock-backed flows for onboarding, planning, voting, and confirmation. **Everything is mock-only**: no screen calls a real API, nothing was run on a physical device, and several SPEC §3 items cannot be met until contract gaps are closed (SPEC §9) or the Gate 3 integration lands.

## SPEC Gate 1 bullets (Developer 1)

| SPEC §8 requirement | Status | Evidence |
|---------------------|--------|----------|
| Screens and navigation | **Met (mock-only)** | `apps/mobile/src/RootNavigator.tsx` (signed-out stack, authenticated tabs Groups/Setup/Planning/Events/Notifications), screens in `screens.tsx`, `groupScreens.tsx`, `memberSetupScreens.tsx`, `planningScreens.tsx`, `votingScreens.tsx`. |
| API-mocked onboarding | **Met (mock-only)** | OTP sign-in/logout, create/join group, preferences, availability, learning toggle, notification permission, weekly settings (`auth.tsx`, `groups.ts`, `memberSetup.ts`). |
| API-mocked planning | **Partially met** | Run start/status/proposals render against `PlanningClient` mock. Aggregate attendance counts and inclusion-aware alternative are **not met — contract gap**. |
| API-mocked voting | **Partially met (mock-only; stubs for missing DTOs)** | Vote and separate veto controls, deadline, counts render from mobile-local stub types (`ProposalVoteStateView`); "Suggest another" is not in the contract and is shown disabled. **Revision and revote UI (SPEC §3 Voting): display-only.** `votingScreens.tsx` (~lines 116-119) shows banner text ("This proposal was revised.", "Revote: please vote again.") when the mobile-local stub `status` string is `revision` or `revote` (`voting.ts` ~line 16). No revision or revote flow exists; contract gap under item e1 (SPEC §11 revision/revote rules are undecided). |
| API-mocked confirmation | **Met (mock-only)** | Confirmed/cancelled/none states, member-visible event, ICS stub (`IcsClient`), notification feed. |

**Exit condition (SPEC §8):** "Each owned module builds/tests independently and respects the frozen public interfaces."

| Exit check | Status | Evidence |
|------------|--------|----------|
| `@gather/contracts` builds | **Pass** | `pnpm --filter @gather/contracts build` |
| Mobile typecheck | **Pass** | `pnpm --filter @gather/mobile typecheck` |
| Mobile lint | **Pass** | `pnpm --filter @gather/mobile lint` |
| Mobile tests | **Pass** — 10 suites, 167 tests | `pnpm --filter @gather/mobile test` |
| Consumes only frozen/stub contracts | **Pass, with caveats** | Imports `@gather/contracts` types (`CONTRACTS_VERSION` = `0.1.1-stub`); mobile-local stubs listed below stand in for missing DTOs. |
| CI covers mobile | **Partly / not explicitly** | See "What CI runs" below: CI does not run mobile typecheck, lint, or tests; no mobile-specific step exists. |

## Verification command

From repo root (no root script exists for mobile; the task did not edit root config):

```bash
pnpm --filter @gather/contracts build && pnpm --filter @gather/mobile typecheck && pnpm --filter @gather/mobile lint && pnpm --filter @gather/mobile test
```

Result when run for DEV1-008: contracts build ok, typecheck ok, lint ok, **10 suites / 167 tests passed**.

## Not verified (no physical device run)

Nothing was run on a physical device or simulator in this task. The following SPEC §3 items are **UNVERIFIED**: OTP login on a physical device, the `gather://` deep link scheme (configured in `app.json`, tested only in Jest with injected links), the Expo notification permission path (`expo-notifications`; Jest uses a mock), and ICS export on a device (the ICS client is a stub that does not produce a file).

## Integration-owner action items

- **What CI runs** (`.github/workflows/ci.yml`, read-only check): `pnpm install --frozen-lockfile || pnpm install`, `pnpm typecheck`, `pnpm run test:dev2`. Root `typecheck` is `pnpm --filter @gather/contracts --filter @gather/api run typecheck`, so mobile typecheck is not run; `test:dev2` covers contracts and api only. CI does not call root `pnpm build`, `pnpm lint`, or `pnpm test`. Those root scripts (`pnpm -r run ...`) would include mobile (its `build` is `tsc --noEmit`, plus eslint and jest), but CI does not invoke them, so mobile is not covered by CI today.
- Action: add the command above (or a `test:dev1` script, or root `pnpm lint`/`pnpm test` plus a mobile typecheck) to CI. Not changed here (root config and CI are the integration owner's).
- Lockfile ownership: `expo-notifications` and `@react-navigation/*` were added to `apps/mobile/package.json` with lockfile updates during DEV1-001..007.

## Contract change requests (SPEC §9)

These are requests only; `packages/contracts/**` was not modified. Each stub must be replaced when the contract lands.

| # | Raised in | Request | Why mobile needs it | Current mobile-local stub |
|---|-----------|---------|---------------------|---------------------------|
| a | DEV1-003 | Frozen error response schema | Distinguish invalid / expired OTP and network errors from real API failures | `AuthError` / `AuthErrorCode` in `apps/mobile/src/auth.tsx` |
| b | DEV1-004 | List-my-groups route, or groups in `GET /v1/me`; display-name field on `GroupMemberResponse`; role values, invite expiry, QR (SPEC §11) | Group list after app restart; readable member list; invite UI | `GroupClient`, `GroupError` in `groups.ts`; in-memory `GroupsProvider` state in `groupsState.tsx`; `gather://invite/<token>` link in `groups.ts` |
| c | DEV1-005 | Weekly schedule DTO for `/v1/groups/:groupId/schedule` (weekday, time, timezone, voting deadline); frozen format for `AvailabilityWindow.startsAt/endsAt`; budget currency/unit | Weekly planning settings UI; availability editor; budget display | `LocalWeeklySettings`, `LocalScheduleClient` in `memberSetup.ts`; `validateWindow` (uses `Date.parse`) |
| d | DEV1-006 | Aggregate attendance count fields and inclusion-aware alternative field on `Proposal` / `PlanningRunProposalsResponse`; frozen planning-run status enum including `failed`; decision on retry (new run vs dedicated route) | SPEC §3 Planning requires aggregate attendance and inclusion-aware alternative display (**not met**); recoverable failed runs | `PlanningClient` and mock scenarios in `planning.ts`; status strings handled in `planningScreens.tsx`; retry starts a new run |
| e1 | DEV1-007 | Vote-state/tally DTO and route (`getVoteState` has no route in SPEC §6.2); deadline; revision/revote state; backend-supplied veto-allowed and vote-allowed flags; aggregate-only privacy guarantee | Render voting state accurately without client-side rules | `ProposalVoteStateView` (status, `approveCount`, `cantMakeItCount`, `vetoAllowed`, `voteAllowed`, `deadline`, `myChoice`) and `VotingClient.getVoteState` in `voting.ts` |
| e2 | DEV1-007 | Cancellation/status field on confirmed event; defined no-event response | Confirmation and cancellation states | `ConfirmedEventView` in `voting.ts` |
| e3 | DEV1-007 | Notification payload DTO | In-app notification feed | `NotificationItemView` in `voting.ts` |
| e4 | DEV1-007 | ICS serialization owner and delivery format (SPEC §11) | ICS export action | `IcsClient`, `IcsExportResult` in `voting.ts` |
| e5 | DEV1-007 | "Suggest another" vote choice | SPEC §3 Voting lists it; `VoteChoice` is only `approve` / `cant_make_it` | disabled control in `votingScreens.tsx` |
| e6 | DEV1-007 | Push-device registration DTO for `POST /v1/me/push-devices` | Push registration | **Not implemented in mobile** (DEV1-011); permission request only, `notifications.ts` |

## Known limitations and deferred review notes

Unfixed reviewer P3s (from the DEV1-001..007 review/test verdicts):

- Optional provider props default silently to mocks: `PlanningProvider` (`planningScreens.tsx`), `VotingProvider` (`votingScreens.tsx`; its `voting` and `ics` props are optional and default to mocks), and member-setup/schedule/notification clients in `RootNavigator.tsx`. These must become required or explicit when real clients land (DEV1-010/011). Only `groupClient` is required today.
- Pending invite token is not tied to a user: a link received while signed out is held and joined by whoever signs in next (`RootNavigator.tsx`).
- `navigationRef.navigate` is called without an `isReady()` guard (`RootNavigator.tsx`).
- Availability editor (`validateWindow` in `memberSetup.ts`) only requires that both strings pass `Date.parse` and that the end is after the start; the window format is not frozen (item c).
- Expo Go on Android restricts notifications; the demo may need a development build.
- `expo-notifications` and navigation dependencies were added; lockfile ownership is the integration owner's.
- Pressing a vote choice while the veto confirm prompt is open silently dismisses the prompt.
- The ICS success notice is hard-coded ("not connected yet (stub)") and must be replaced with real wiring.
- Sign-out during an in-flight invite join makes the navigate a no-op against the signed-out navigator (DEV1-004 P3; dev warning only).
- DEV1-001 cosmetic P3s: mobile `build` script duplicates `typecheck` (`tsc --noEmit`); README `--tunnel` step may prompt to install `@expo/ngrok` (not a repo dependency); `package.json` mixes `~`/`^`/exact ranges and devDependencies are not alphabetized. (The `HomeProfile` alias noted then was removed when `HomeScreen` was replaced in DEV1-002.)
- Earlier P3s: busy-guard on OTP screens is render-state based; no test for back navigation from the OTP screen; planning group switch is not disabled while a start is in flight; planning Retry resubmits the current text field.

Fixed after review (no longer open):

- DEV1-004: malformed invite link `URIError` (`parseInviteToken` now returns null); links received while signed out are held and joined after sign-in; launch URL no longer replayed; join feedback from other tabs.
- DEV1-005: preferences/availability load failure no longer allows Save (no data loss, Retry recovers); learning status shows the persisted value versus an unsaved draft.
- DEV1-006: a completed run whose proposals fetch fails now shows a "Refresh proposals" control.
- DEV1-007: single-press veto replaced by a confirm step; honest ICS stub copy; stale/late results guarded; synchronous double-press races on ICS export and veto confirm (commit `c6e2046`); the duplicated `expect` line in `votingAdversarial.test.tsx` is gone.

## Not ready to start

DEV1-009 through DEV1-012 (Gate 3 / Gate 5) are **blocked**. They need Gate 2 (real backend and planner integrated); there is no `GATE2-EXIT` task defined in `tasks/index.md`. They also need the contract freeze items above. No SPEC §11 item was guessed in mobile.
