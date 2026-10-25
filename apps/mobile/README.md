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

Supabase and API URLs will be wired in a follow-up task. Until then, use API mocks matching `packages/contracts` (read-only) once GATE0-002 DTOs are approved.

## Navigation shell (DEV1-002)

React Navigation native stack with placeholder screens. Manual smoke: launch app → **Welcome** → mock sign-in → **Home** → **Groups** → back → mock sign-out → **Welcome**.

| Screen (route) | SPEC §1 journey step | Status |
|----------------|----------------------|--------|
| `Welcome` | 1 — Authenticate (email OTP) | Placeholder; mock continue only |
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
