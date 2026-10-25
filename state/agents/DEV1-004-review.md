# DEV1-004 Re-review (repair pass 1, candidate ce76cc4, prior e856f41)

Verdict: APPROVE

## Prior findings
- P1 parseInviteToken URIError on malformed escapes: RESOLVED (try/catch returns null, apps/mobile/src/groups.ts:35-42; unit test in groups.test.ts and launch+running screen test with "%E0%A4%A").
- P2 signed-out running-app links dropped: RESOLVED (Linking handled in always-mounted RootNavigator, pending token held in state, apps/mobile/src/RootNavigator.tsx:81-93; test "held and joined after sign-in" drives the real sign-in flow).
- P2 launch URL replay / other-tab feedback: RESOLVED (getInitialURL read once per RootNavigator mount; InviteJoiner navigates via navigationRef to Groups/GroupDashboard from any tab and Alerts on failure; tests cover no replay after sign-out/in, other-tab navigation, Alert on bogus token).
- P3 eslint-disable: RESOLVED (useInviteLinkJoin removed; lint clean).

## New-bug hunt
- Double join: pending token consumed by one effect run; onDone clears it. Cold-start and url event with the same token set identical state (no re-render), and groups add() dedups by id. A different token arriving mid-flight starts its own join; the first join's clear does not drop it because its effect already ran. No issue.
- Stale token / sign-out: InviteJoiner unmounts with the session; pending state is cleared in finally even after unmount. A token received while signed out is intentionally held until next sign-in (could join under a different account); P3.
- Listener lifecycle: subscription removed in effect cleanup; hooks run before the loading early-return. OK.
- Token logging: none. Alert/navigation loops: none. Session-load vs link race: link held in state during loading, joined once GroupsProvider mounts.

## New findings
- P3 apps/mobile/src/RootNavigator.tsx:59 navigationRef.navigate called without navigationRef.isReady(); async after mount so works in practice, cheap guard recommended.
- P3 apps/mobile/src/RootNavigator.tsx:51-65 pending token not tied to a user; held across sign-out/sign-in as another user would join that user. Fine for mock; document or clear on sign-out.
- P3 Sign-out mid-join: navigate targets the signed-out navigator (dev warning, no-op).

## Acceptance / constraints
- Create/join flows, member list, dashboard entry points, multiple groups met against mocks; fixtures type-check against @gather/contracts.
- No contract drift (packages/contracts untouched), no private data (privacy test retained), no client-side voting/authorization logic. Changes since e856f41 are apps/mobile/** only (plus this file).

## Commands run (all pass)
- pnpm --filter @gather/contracts build
- pnpm --filter @gather/mobile typecheck
- pnpm --filter @gather/mobile lint
- pnpm --filter @gather/mobile test (4 suites, 35 tests passed)
