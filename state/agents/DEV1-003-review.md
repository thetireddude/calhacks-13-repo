# DEV1-003 Review

Verdict: APPROVE (no P0/P1/P2)

Candidate 4ee6505. Surface: apps/mobile/** plus task status only; lockfile/manifests unchanged.

## Checks
- Mock OTP flow reaches authenticated tabs (RootNavigator.test). Invalid/expired/network are distinct AuthError codes with distinct messages, each recoverable (retry, resend) and tested.
- AuthError is mobile-local; verified packages/contracts/src has no error schema, so justified; comment in auth.tsx:15-16 notes the swap.
- OTP length/expiry/rate-limit not invented; auth.tsx comment marks them unapproved; EMAIL_PATTERN commented as not a policy.
- No logging of email/OTP, no secrets.
- DEV1-002 P3s: requestOtp rejection handled (screens.tsx send()), error cleared on change/retry, loading indicator replaces null. The back-nav test P3 remains untested (acceptable).
- Anti-bloat: no new deps; mock setters are the minimum for fixtures.

## Findings
- P3 screens.tsx:75-90,100-112: busy guard relies on re-render disabling the Button; a very fast double press could fire two requests. Harmless with the mock; consider a ref guard with the real client (DEV1-009).
- P3 screens.tsx:85-87: on verify success busy stays true, relying on unmount; OK, but if the navigator ever kept the screen mounted it would be stuck.
- P3 auth.tsx mock: the `code.trim()===""` branch after outcome check is only reachable on success outcome; screen already blocks empty code. Trivial.
- P3 No test for back navigation from Otp to Email, or the Verify-disabled-while-busy state.

## Commands (in worktree, all pass)
pnpm --filter @gather/contracts build; pnpm --filter @gather/mobile typecheck; lint; test (2 suites, 14 tests passed).
