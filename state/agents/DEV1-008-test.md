# DEV1-008 tester verdict

Candidate 4c83d77 (agent/DEV1-008-gate1-exit-mobile). Verdict: PASS (with one factual naming error and one overclaim to fix).

## Commands (worktree only)
- pnpm install --frozen-lockfile: up to date.
- Documented command exactly (contracts build, mobile typecheck, lint, test): all exit 0. Jest: 10 suites / 167 tests passed (matches docs; per-file counts incl. describe: sum matches).
- pnpm -r run build: ok, mobile included (its build is `tsc --noEmit`). pnpm -r run lint: ok, mobile (eslint) included. pnpm -r run test: mobile 10/167 pass.
- Root package.json: typecheck = `--filter @gather/contracts --filter @gather/api run typecheck`, so mobile is not covered. Claim verified. Note: root `build`/`lint`/`test` DO include mobile via `pnpm -r`; the docs only say typecheck (and CI) do not cover mobile. Not checked: .github/workflows/ci.yml content was not read, so the "CI does not run mobile" claim is only partly verified (root typecheck part verified). (Integration owner should confirm; root lint/test do run mobile if CI calls them.)

## Discrepancies
1. docs/gate1-dev1-exit.md "Known limitations": cites `VoteProvider` in `votingScreens.tsx`; the real name is `VotingProvider` (exists, props `voting?`/`ics?` optional, default to mocks). `VoteProvider` does not exist anywhere. Fix the name.
2. state/GATE1-DEV1-EXIT.md push row: test "notification feed renders with push permission denied and no registration" renders feed with a "denied" permission client but never asserts anything about registration (no registration code exists). Row claim "denied does not block" is supported; "no registration" is not asserted. Minor overclaim in the test name, not in the docs.

## Citations
- All 30+ quoted test names (incl. ellipsis-truncated prefixes) found by script in the cited files. The "MISS" hits were UI strings/headings, not test names ("Suggest another", "not connected yet (stub)" exists in tests as "Calendar export is not connected yet (stub).").
- All cited source/test paths exist. Test file list (10) matches. All identifiers exist where cited: AuthError/AuthErrorCode (auth.tsx), GroupClient/GroupError (groups.ts), GroupsProvider (groupsState.tsx), LocalWeeklySettings/LocalScheduleClient/validateWindow (memberSetup.ts; validateWindow appears once, i.e. cited but I did not verify it uses Date.parse beyond that), PlanningClient (planning.ts), ProposalVoteStateView/ConfirmedEventView/NotificationItemView/IcsClient/IcsExportResult/VotingClient.getVoteState (voting.ts), PlanningProvider (planningScreens.tsx). ProposalVoteStateView fields approveCount, cantMakeItCount, vetoAllowed, voteAllowed, deadline, myChoice, status all present. CONTRACTS_VERSION = "0.1.1-stub". `gather` scheme in app.json. Commit c6e2046 exists. No `isReady` guard in RootNavigator.tsx (claim holds). Tasks DEV1-009..012 backlog; no GATE2-EXIT task defined (matches).
- Evidence rows spot-read (14): signed-out/sign-in (RootNavigator), invalid/expired/network OTP (distinct errors, recovery asserted), seed join (groupScreens), group privacy (JSON has no availab/preference/etc.), preferences round trip, denied push + throwing request, three proposals/cap-at-three, failed run recoverable, open voting (deadline, counts, vote + veto controls, disabled suggest), veto hidden, distinct controls, cancelled event, declined member opens event, ICS stub only checks call, aggregate-only privacy. All assert what the row claims, except item 2 above. Weakness (not a discrepancy): "declining member can open event" uses independent mock event state, consistent with the docs' "against mocks" label.

## README mock flow
- Any non-empty OTP code signs in: verified in createMockAuthClient (only `code.trim()===""` throws invalid_code); App.tsx uses createMockAuthClient. Email must pass a client-side shape check ("valid-looking" is accurate). Whitespace-only code is rejected (consistent with "non-empty").
- Seed token `seed-invite`: MOCK_SEED_INVITE_TOKEN in groups.ts; groupScreens.test.tsx joins via pasted token and deep link `gather://invite/seed-invite` (inviteLink) and sees seeded member "user-seed". App.tsx uses createMockGroupClient. Verified.

## Diff scope
git diff feature/mobile...HEAD --stat: apps/mobile/README.md, docs/gate1-dev1-exit.md, state/CURRENT.md, state/GATE1-DEV1-EXIT.md, tasks/DEV1-008 task file, tasks/index.md. Docs/state only; no production code, CI, root config, or lockfile. state/CURRENT.md diff is purely additive (+9 lines, new "# Developer 1 (Mobile)" section appended); Dev 2 content unchanged. Task file edit is 1 line (status).
