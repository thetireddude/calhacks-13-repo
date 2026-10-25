# DEV1-007 tester verdict (re-test after repair pass 1)

Verdict: PASS with caveats (original two defects fixed; 2 new tests intentionally failing, both P3 batched-press races)

Candidate: ba9dda4. Test commit: 4d3390f (adds apps/mobile/src/votingRepair.test.tsx only).

Commands: git reset --hard ba9dda4; pnpm install --frozen-lockfile; pnpm --filter @gather/contracts build; npx jest (in apps/mobile): 128/128 pass pre-addition; with new file 164 pass / 2 fail (38 new tests, 36 pass). tsc --noEmit and eslint clean on new file.

Original defects: both previously failing tests (stale p1 state under p2; late p1 refresh on p2) pass unchanged in intent. Fixed via keyed remount plus mounted ref and stale() guards.
Adapted tests reviewed (diff c0ed731..ba9dda4): veto tests adapted to two-step confirm (legit); refresh-failure message assertion (legit); ICS tests changed from "Calendar file ready: <name>" to stub copy and the filename assertion dropped (legit with honest-copy change). voteAllowed added to fixtures. None weakened.

New coverage (all pass unless noted): veto confirm (no call on first press, Cancel, triple Confirm press = 1 call, no leak across proposals/after success/after failure, vote buttons never call veto, disabled while in flight); proposal-switch races (slow vote, slow veto reject, veto+refresh reject, slow initial load); unmount during every in-flight phase (no console warnings, no unhandled rejections); action-vs-refresh messaging (four combos); voteAllowed x status matrix; ICS honest copy/failure/double-press (awaited); StrictMode for VoteSection, switching, Events+Notifications.

Failures (production defects, not test mistakes):
1. P3 - GroupEvent exportIcs guard `if (exporting) return` reads render-closure state. Two presses dispatched synchronously before re-render both call ics.exportIcs (expected 1, received 2). Test: "synchronous double-press in one act".
2. P3 - VoteSectionBody act()/busy has the same race: two Confirm veto presses in one batch call voting.veto twice (expected 1, received 2). Test: "veto Confirm pressed twice synchronously calls veto once".
Sequential presses (awaited, as in real RN discrete taps) are correctly blocked. Fix: useRef in-flight guard. No P0-P2 found.
Note: tests that fail only by overlapping act() warnings were my own mistake and are fixed.
