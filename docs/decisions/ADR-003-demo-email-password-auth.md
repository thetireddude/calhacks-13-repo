# ADR-003: Email + password sign-in for the demo build

## Status

Proposed (Dev 1 / orchestrator record; needs Dev 2 and Dev 3 acknowledgment under SPEC §9)

## Context

SPEC §1/§2 and the Gate 1 checklist freeze **Supabase email OTP** as the login method. On the project's Supabase instance the email OTP flow could not be completed: auth emails contained a sign-in link instead of a code, the link opens a Site URL the phone cannot reach, and the email template could not be changed to send `{{ .Token }}` in time. Cal Hacks demo time is limited.

## Decision

For the demo build, mobile signs in with **Supabase email + password** (`signUp`, `signInWithPassword`) instead of email OTP. The Supabase project setting **Confirm email** must be **off** so sign-up returns a session without sending email.

## Consequences

- Backend, database, and contracts are unaffected: the API only verifies the Supabase-issued JWT (`Authorization: Bearer`) and uses the `sub` claim.
- Only `apps/mobile/**` changes. The OTP code screen is removed from the mobile app.
- No email ownership check: anyone who knows an email address can register it. Acceptable for a demo; **not** acceptable for production.
- SPEC §2 and the SPEC §8 checklist item "Email OTP can be requested and completed" no longer describe mobile behavior. Restoring email OTP later means re-enabling the OTP flow from DEV1-009 (`requestOtp` / `verifyOtp`, still in git history) and fixing the Supabase email template, which requires custom SMTP.
- If Confirm email is turned back on, mobile shows a clear "confirmation required" error rather than succeeding silently.
