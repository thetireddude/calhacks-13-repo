# DEV1-005 re-review (candidate cb2312c, prior 580adcc)

Verdict: APPROVE (no open P0-P3 blockers)

## Prior findings
- P2-1 RESOLVED. Both screens return early while `!loaded`; the form (and Save button) renders only after a successful load. A failed load shows alert + Retry; a failed Retry sets loadFailed again, so Save stays unreachable. `loaded` is set only in the success handler. A late/stale load cannot clobber edits: the form is hidden until the load settles, and each attempt only starts after the previous one settled. Tests count PUTs on the mock (`puts()` toBe 0) and assert Save absent, for both preferences and availability, with recovery on Retry.
- P2-2 RESOLVED. Status line shows persisted `savedLearning` ("Saved: learning is on/off."), updated only from the PUT result after success; draft difference shows "Unsaved change.". On failed PUT, draft is kept, error shown, "Saved:" unchanged (code path: setSavedLearning is after await in try). Test covers draft vs saved and post-save update. (Failed-PUT UI path is by inspection, not a dedicated test: minor.)
- P3-2 resolved (privacy test now asserts own data renders and other-member absent). P3-3 resolved (hints; weekly planning labelled mobile-local, unapproved; availability hint says format not final). P3-5 resolved (blank line).
- P3-1 / P3-4 remain handoff notes (orchestrator: availability window/timezone format SPEC section 9 request; Expo Go notification limits). Not code issues.

## New findings
None. No logging added; no other users' data shown. Minor nit only: no dedicated test for failed PUT keeping draft/"Saved:" unchanged; setState after unmount on load is harmless.

## Commands
pnpm --filter @gather/contracts build OK; mobile typecheck OK; lint OK; test 6 suites / 49 tests pass.
