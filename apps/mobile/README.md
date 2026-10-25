# Gather Mobile (`apps/mobile`)

**Owner:** Developer 1  
**Branch:** `feature/mobile`

Expo (SDK 58) / React Native / TypeScript client. See [`docs/developers/developer-1-mobile.md`](../../docs/developers/developer-1-mobile.md) and SPEC §3.

## Status

Bootstrap (DEV1-001): one placeholder home screen that type-imports `@gather/contracts`. No API calls, auth, or planning UI yet. Use API mocks matching `packages/contracts` until backend integration (Gate 3).

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
