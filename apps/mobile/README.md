# Gather Mobile (`apps/mobile`)

**Owner:** Developer 1  
**Branch:** `feature/mobile`

Expo / React Native TypeScript client. See [`docs/developers/developer-1-mobile.md`](../../docs/developers/developer-1-mobile.md) and SPEC §1 (MVP journey).

## Local development

From the repository root:

```bash
pnpm install
pnpm --filter @gather/mobile start
```

Platform shortcuts (also from root):

```bash
pnpm --filter @gather/mobile android
pnpm --filter @gather/mobile ios
pnpm --filter @gather/mobile web
```

Use the Expo Go app on a physical device, or an iOS Simulator / Android emulator when available.

## Environment

Supabase and API URLs will be wired in a follow-up task. Until then, auth uses **`src/api/mockAuth.ts`** (in-memory session, no network). Group and planning mocks will align with `packages/contracts` as backend routes land.

## Auth flow (DEV1-003)

Mock email OTP (no Supabase yet):

1. **Welcome** — enter email → mock `requestEmailOtp`
2. **OtpVerify** — enter 6-digit code → mock `verifyEmailOtp` (code **`123456`** for any valid email)
3. **Home** — signed-in hub; mock sign-out clears session

Manual smoke: launch app → **Welcome** → send code → **OtpVerify** → `123456` → **Home** → **Groups** → back → sign out → **Welcome**.

## Navigation shell (DEV1-002 + DEV1-003)

React Navigation native stack with placeholder screens.

| Screen (route) | SPEC §1 journey step | Status |
|----------------|----------------------|--------|
| `Welcome` | 1 — Authenticate (email) | Email entry + mock send |
| `OtpVerify` | 1 — Authenticate (OTP) | Code entry + mock verify |
| `Home` | Signed-in hub before planning/voting | Placeholder |
| `GroupsList` | 2 — Create or join a group | Placeholder list |
| — | 3 — Preferences & availability | Not in shell yet |
| — | 4–6 — Planning run & ranked proposals | Not in shell yet |
| — | 7–8 — Voting / veto / revote | Not in shell yet |
| — | 9–10 — Confirmed event (group-visible) | Not in shell yet |
| — | 11 — ICS calendar export | Not in shell yet |
| — | Notifications, scheduled runs, inclusion history | Not in shell yet |

## Smoke checks

```bash
pnpm --filter @gather/mobile typecheck
pnpm --filter @gather/mobile build
```

`build` runs TypeScript checking and validates the Expo config.
