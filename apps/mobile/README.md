# Gather Mobile (`apps/mobile`)

**Owner:** Developer 1  
**Branch:** `feature/mobile`

Expo (SDK 58) / React Native / TypeScript client. See [`docs/developers/developer-1-mobile.md`](../../docs/developers/developer-1-mobile.md) and SPEC §3.

## Status

Gate 1 mobile work (DEV1-001..007) is complete as **mock-only**. Nothing calls a real API and nothing has been verified on a physical device.

- Signed-out stack (email, OTP) and authenticated tabs: Groups, Setup, Planning, Events, Notifications.
- Mock clients for auth, groups, member setup, weekly settings, planning, voting, ICS, and notifications. Notification permission uses `expo-notifications` for real; denying it does not block use.
- Contracts consumed from `@gather/contracts` (`0.1.1-stub`); mobile-local stub types stand in for missing DTOs.
- Not met due to contract gaps: aggregate attendance counts, inclusion-aware alternative, "Suggest another".

Gate 1 evidence and SPEC §9 contract change requests: [`docs/gate1-dev1-exit.md`](../../docs/gate1-dev1-exit.md), [`state/GATE1-DEV1-EXIT.md`](../../state/GATE1-DEV1-EXIT.md).

### Try the mock flow

1. Start the app (see below).
2. Enter any valid-looking email, then **any non-empty OTP code** to sign in.
3. Join a group with the seed invite token `seed-invite` (or open `gather://invite/seed-invite`), or create a group.

### Known limits

- Expo Go on Android restricts notifications; the demo may need a development build.
- OTP on a physical device, the `gather://` deep link, the notification permission path, and ICS export on a device are all UNVERIFIED.
- Real integration is Gate 3 (DEV1-009..011), blocked on Gate 2 and the contract freeze.

## Commands

From the repo root:

```bash
pnpm install
pnpm --filter @gather/contracts build      # required before typecheck (contracts resolve from dist/)
pnpm --filter @gather/mobile start         # Expo dev server
pnpm --filter @gather/mobile typecheck
pnpm --filter @gather/mobile lint
pnpm --filter @gather/mobile test
```

## Run on a physical device (Expo Go)

1. Install **Expo Go** from the App Store / Google Play.
2. Put the phone and computer on the same Wi-Fi network.
3. Run `pnpm --filter @gather/mobile start` and scan the QR code (Camera app on iOS, Expo Go on Android).
4. If the device cannot reach the dev machine, run `pnpm --filter @gather/mobile start -- --tunnel`.

Press `i` / `a` in the dev server terminal to open an iOS simulator / Android emulator if installed.
