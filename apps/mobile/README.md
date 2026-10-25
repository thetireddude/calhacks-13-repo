# Gather Mobile (`apps/mobile`)

**Owner:** Developer 1  
**Branch:** `feature/mobile`

Expo / React Native TypeScript client. See [`docs/developers/developer-1-mobile.md`](../../docs/developers/developer-1-mobile.md) and SPEC §3.

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

## MVP placeholder screens (SPEC §1)

Planned navigation shell (not yet implemented):

1. Auth — email OTP sign-in
2. Groups — create or join a group
3. Preferences & availability
4. Planning — initiate or view a planning run
5. Proposals — ranked plans (up to three)
6. Voting — vote / veto / revote flows
7. Confirmed event — group-visible details
8. Notifications — in-app feed
9. Calendar export — ICS

## Smoke checks

```bash
pnpm --filter @gather/mobile typecheck
pnpm --filter @gather/mobile build
```

`build` runs TypeScript checking and validates the Expo config.
