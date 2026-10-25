# DEV1-002 Review

Verdict: APPROVE (no P0/P1/P2)

Candidate: e36c558 on agent/DEV1-002-navigation-auth-shell (base feature/mobile)

## Checks
- Allowed surface: only apps/mobile/**, pnpm-lock.yaml (222 additions, 0 removals; mobile importer deps only; `pnpm install --frozen-lockfile` clean), task status ready->candidate. OK.
- Acceptance: signed-out gating and logout covered. RootNavigator.tsx:38-51 mounts authenticated tabs only when `session` is set, so signed-out users cannot reach them. signOut (auth.tsx:68-71) clears the client session, then state; returns to the Email screen.
- AuthClient (auth.tsx:9-14) has 4 methods, is swappable via AuthProvider `client`, and the session type is opaque and mobile-local. No token format or OTP rules invented; the mock accepts any non-empty code and says so.
- No logging, no persistence, no secrets, no voting/fairness/private data. Placeholders only.
- Dependencies: react-native-screens ~4.30.0 and react-native-safe-area-context ~5.10.1 match expo bundledNativeModules.json (SDK 58). react-navigation 7.x peers satisfied (RN *, screens >=4, safe-area >=4, native ^7.5.1).
- Anti-bloat: small, 3 source files; the old HomeScreen was deleted (replaced by the shell), which is fine.
- Tests: 4 behavior tests (signed-out gating, failed verify, existing session, sign-in then logout and session cleared). Meaningful.

## Findings
- P3 screens.tsx:30-34: `requestOtp` rejection is unhandled in EmailScreen (no error UI/try-catch). Irrelevant for the mock; address in DEV1-009 when the real client can fail.
- P3 screens.tsx:57-63: OtpScreen error is not cleared on retry or on success; cosmetic.
- P3 No test that the OTP screen is unreachable/back-nav from the signed-out stack; the AuthClient swap is untested beyond the mock (acceptable).
- P3 RootNavigator.tsx:36 returns null while loading (blank flash); acceptable for a shell.

## Commands run (in worktree)
- pnpm install --frozen-lockfile: clean
- pnpm --filter @gather/contracts build: pass
- pnpm --filter @gather/mobile typecheck: pass
- pnpm --filter @gather/mobile lint: pass
- pnpm --filter @gather/mobile test: 4/4 pass
- npm view for @react-navigation/* peers; grep bundledNativeModules.json
