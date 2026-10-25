# DEV1-007 re-review (candidate ba9dda4, repair pass 1; prior c3c376b)

Verdict: APPROVE (no P0/P1/P2 open). Non-blocking P3s below.

Commands: pnpm --filter @gather/contracts build; mobile typecheck, lint, test -> all pass (9 suites, 128 tests).
Scope: diff touches only apps/mobile/** (voting.ts, votingScreens.tsx, 2 test files); no package.json/lockfile/contracts/state edits; no new deps; no logging.

## Prior findings
- P2 canVote from status: RESOLVED. canVote = state.voteAllowed (votingScreens.tsx:100); only other use of status is the display banner. voteAllowed is commented in voting.ts:23-25 as mobile-local stub pending SPEC 9, not a contract field.
- P2 veto single press: RESOLVED. Veto button only sets confirmingVeto; voting.veto() is called only from the "Confirm veto" button. Cancel only clears state (no call). act() clears confirmingVeto and sets busy before the call, so Confirm vanishes/disables: double press = one call. Confirm resets on success, failure, and proposal change (key remount). Veto remains separate control, never a VoteChoice.
- P2 ICS copy: RESOLVED. Notice now "Calendar export is not connected yet (stub)." and no longer claims a file exists. Export has an `exporting` guard (early return + disabled button) reset in finally.
- P3 stale state / unguarded act: RESOLVED. Inner body keyed by proposalId; mounted ref set true on effect start, false in cleanup (correct under StrictMode double-effects). Late results after unmount do no setState; the server call still happens (acceptable).

## New-bug hunt (none found)
- Action vs refresh errors are separate: GENERIC_ERROR only when the action call rejects; "Your action was recorded, but the latest state could not be loaded" only after the action resolved. Never claims success on action failure, and never shows failure after a successful action with a successful refresh.
- Busy guard preserved: busy true during act, reset on every non-stale path (action fail, refresh ok, refresh fail). Buttons keep disabled={busy}.
- No client-side voting rules; privacy unchanged (aggregate counts + own choice only).

## Test edits
Compared with c0ed731: veto tests now press veto then confirm (same assertions on call counts/payload, plus added not-called-before-confirm and Cancel checks); double-press test presses Confirm twice and still asserts one call; refresh-failure test changed from generic text to the new, more specific message while still asserting no false "Your vote" state; ICS tests only swap the copy string. Intent preserved, nothing weakened.

## New P3 (non-blocking)
- P3 votingScreens.tsx ~:204 success notice is hard-coded "not connected yet (stub)" even when exportIcs resolves; fine for mock, must be replaced when real ICS wiring lands.
- P3 votingScreens.tsx:73-90 pressing a vote choice while the veto confirm prompt is open silently dismisses the prompt (act clears confirmingVeto); harmless.
- P3 test file has a duplicated `expect(veto).not.toHaveBeenCalled()` line (votingAdversarial.test.tsx ~:115).
