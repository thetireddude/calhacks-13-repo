# DEV1-006 review (commit 6aee4ed)

Verdict: APPROVE (no P0/P1; one P2 worth fixing, P3s optional)

## Verified
- Surface: apps/mobile/** + task status only; no package.json/lockfile changes; no new deps.
- PlanningClient has exactly the three SPEC 6.2 planning-run methods; types are the contracts types; no invented fields (mock sets only id/groupId/status/initiatedBy/createdAt/activityRequest).
- Proposals: slice(0,3) of backend order, no sort/score; deterministicScore and revisionId never rendered. Rank shown as backend-provided p.rank.
- Statuses: pending, completed (with proposals, empty message), failed, unknown (neutral "Status: x" + refresh) all handled.
- Aggregate attendance counts and inclusion alternative are absent from Proposal (only proposalId, rank, summary, deterministicScore?, explanation?, revisionId?), so correctly not rendered.
- Request text is not logged (catch has no logging; generic error text).
- Group selection: none -> message; one -> name; several -> buttons, default first group, switching resets run/proposals; render also guarded by run.groupId === group.id.

## Findings
- P2 apps/mobile/src/planningScreens.tsx:~63 (RunView "completed") and :~88-92 (load): if createRun/getRun succeed but getProposals throws, run is set to completed with proposals=null, so the UI shows "Loading proposals." forever plus a generic error; there is no refresh/retry control in that branch. Add a Refresh button (onRefresh) to the completed+null-proposals case. Also untested.
- P2 (contract, not code) Task requires "aggregate attendance counts" and "inclusion-aware alternative", but the contract has no such fields. Rendering nothing is correct; ensure the SPEC section 9 contract change request is in the handoff (the code comment says it is) and that the acceptance criterion is recorded as deferred in state/CURRENT.md.
- P3 planningScreens.tsx:~14 PlanningProvider falls back to createMockPlanningClient() when no client is passed, and RootNavigator makes planningClient optional. When the real client lands, an omitted prop would silently ship mock data. Make the prop required (App.tsx already passes it) or drop the fallback; tests always pass one.
- P3 planningScreens.tsx group-switch buttons are not disabled while busy: an in-flight start() for group A can call setRun(A-run) after switching to B (hidden by groupId guard) but reappears if the user switches back to A, showing a stale run; setProposals can also be set late. Disable switching while busy or ignore results from superseded calls.
- P3 Retry (onRetry=start) re-submits the current text field, which the user may have edited since the failed run; and the double-submit guard is state-based (busy), adequate for UI taps but not a ref guard. Acceptable as a neutral stub; comment states no separate retry route exists, no backend semantics invented.
- P3 privacy test: the leaky fields are never rendered by construction, so it is a reasonable regression guard but only spies console.log (not warn/error). Acceptable.
- P3 test "failed run" only covers mock client's failed scenario; "completed with getProposals rejection" untested (see P2).
- P3 mock status "failed" is not named by the contract (only pending/completed); comment documents it as a stub. Fine.

## Commands run (in worktree)
- git diff --stat feature/mobile...HEAD and per-file diffs
- pnpm --filter @gather/contracts build: pass
- pnpm --filter @gather/mobile typecheck: pass
- pnpm --filter @gather/mobile lint: pass
- pnpm --filter @gather/mobile test: 5 suites, 43 tests pass
