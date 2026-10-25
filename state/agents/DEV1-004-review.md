# DEV1-004 Review — CHANGES_REQUESTED

Candidate e856f41 (agent/DEV1-004-groups-ui-mock). Surface OK: apps/mobile/** + task status only; lockfile unchanged.
Commands run: pnpm install --frozen-lockfile; pnpm --filter @gather/contracts build; pnpm --filter @gather/mobile typecheck, lint, test (31/31 pass, all clean).

## Findings

P1 apps/mobile/src/groups.ts:30 (parseInviteToken) — decodeURIComponent throws URIError on malformed percent-escapes
(e.g. gather://invite/%E0%A4%A). Called from handle() in groupsState.tsx:~67 outside any try/catch: in the "url" listener it
throws synchronously (uncaught JS error / app crash in release); for getInitialURL it is an unhandled rejection. Violates
"malformed link safe". Fix: wrap in try/catch returning null (or skip decoding) and add a malformed-link test.

P2 apps/mobile/src/groupsState.tsx:56-78 — "signed-out link handled after sign-in" only holds for the cold-start URL
(getInitialURL). A gather:// link opened while the app is running signed out fires the "url" event with no listener mounted
and is dropped. Also untested (no signed-out deep-link test). Fix: attach the Linking listener at app/root level and stash a
pending token until a session exists (or document as a limitation and test the cold-start case).

P2 groupsState.tsx:67 / groupScreens.tsx:~40 — getInitialURL returns the same launch URL on every mount of GroupListScreen,
so sign-out/sign-in (provider remounts) re-runs the join and re-navigates to the dashboard; React StrictMode double-invokes
too (join is idempotent in mock, but unexpected navigation; real API idempotency is unverified). Consume the initial URL once
(module/ref flag). Also: a link arriving while another tab is focused joins but gives no visible feedback (navigates only
inside the hidden Groups stack; errors set on a hidden screen).

P3 groupsState.tsx:76 eslint-disable exhaustive-deps — acceptable in practice: joinByToken is stable per client, handlers
are inline closures over navigation/setError, so the stale-closure risk is small and active flag prevents post-unmount calls.
But a latest-handler ref would remove the disable and the stale-closure concern with no extra complexity.

P3 Privacy tests (groups.test.ts last test, groupScreens.test.tsx last test) are regex denylist checks over fixtures/render;
weak but meaningful as a smoke test. Stronger: assert exact key sets (already done for DTOs in groups.test.ts — good) on
rendered member rows. No change required.

P3 groupScreens.tsx:~146 member list shows raw userId only (no display name in contract) — acceptable; mock role strings
documented as placeholders (SPEC §11).

## Checks passed
- Mock payloads match packages/contracts/src/groups.ts exactly (no invented fields; key-set assertions in tests); typed with contract DTOs.
- GroupClient has exactly the 5 SPEC §6.2 routes; no "list my groups" route invented (groups kept in local state, documented).
- Member list renders only userId/role/joinedAt. Multiple groups supported and tested.
- Deep link: token only, no logging, non-invite/other-scheme links ignored; app.json scheme "gather" is the only config change.
- Provider mounted only while session exists, so group state resets on sign-out (mock client itself persists in App.tsx, fine for a mock).
- No client-side authorization/voting/fairness logic; no secrets; no new dependencies; anti-bloat OK (GroupError/inviteLink small, justified).
