# Mobile demo runbook (DEV1-012)

Scope: running the Gather mobile app on a physical phone against the real local API and Supabase. Status of each checklist row is blank until someone runs it on a device; nothing here has been device-verified yet.

## 1. Prerequisites

- Node and pnpm installed; run `pnpm install` at the repo root, then `pnpm --filter @gather/contracts build` (mobile resolves contracts from `dist/`).
- Phone with **Expo Go** (SDK 58 build) for the demo. Android Expo Go restricts notifications, so use a development build if you need to show the real push-permission prompt on Android.
- Phone and API machine on the same Wi-Fi, or both on Tailscale. If Metro (the Expo dev server) is unreachable, use `pnpm --filter @gather/mobile start -- --tunnel` (from `apps/mobile/README.md`).
- Supabase project settings: **Authentication > Providers > Email enabled (email + password)** and **Confirm email OFF**. With confirmation on, sign-up does not return a session and the app cannot proceed.
- Two test accounts (two phones, or one phone signing out/in) for the join and "declined member" steps.

## 2. Run the stack

API. The `pnpm --filter @gather/api dev` script is currently broken (it runs `tsx --env-file ../../.env watch …`, which tsx reads as a file named `watch`; reported to Dev 2). Run the server directly from `apps/api`:

```bash
cd apps/api
node_modules/.bin/tsx --env-file ../../.env src/index.ts
```

- Reads the root `.env` (never commit it). Variable names are in `.env.example`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `PORT`, `HOST`, and others.
- Listens on `HOST` (default `0.0.0.0`) and `PORT` (default `3000`). It must listen on `0.0.0.0` so the phone can reach it.
- Check from the phone browser: `http://<API_IP>:<PORT>/v1/health` should return `{"status":"ok"}`.

Mobile: create `apps/mobile/.env` (gitignored) with public values only:

```
EXPO_PUBLIC_SUPABASE_URL=<project url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
EXPO_PUBLIC_API_URL=http://<API_IP>:<PORT>
```

- API machine (node1): LAN `192.168.1.201`, Tailscale `100.98.78.15`. Use the LAN IP when the phone is on the same Wi-Fi, the Tailscale IP when the phone has Tailscale. Never `localhost`. Include the port (default 3000) unless the API is served on 80.
- Never put the service-role key or JWT secret in `apps/mobile/.env`.
- Start: `pnpm --filter @gather/mobile start`, scan the QR code. Restart Metro (`--clear`) after editing `.env` so the `EXPO_PUBLIC_*` values are re-inlined.

### Live backend smoke test (no phone needed)

With the API running as above, this script signs two disposable users in against the real Supabase project and drives the real mobile HTTP clients end to end (me, groups, invite/join, preferences, availability, schedule, planning, vote, confirmed event, notifications, ICS). It prints PASS/FAIL per step, never keys or tokens, and deletes the users and groups it created.

```bash
cd apps/mobile
../api/node_modules/.bin/tsx --env-file ../../.env scripts/live-smoke.mts
```

Requires `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in the root `.env`. Last run (2026-10-24, against the `gather` project, API from this branch): **19 of 20 PASS**. The one failure is the weekly schedule save, because migration `20261024180400_group_schedules.sql` is not applied on the cloud project. Apply it with `supabase db push` (link first with `supabase link --project-ref <ref>`); do not apply it by pasting SQL, which records a different migration version.

The first live run also found that the cloud project signs tokens with ES256, which the API rejected until DEV2-026 (PR #6) added JWKS verification. Until that is merged into your API branch, every real login gets 401.

## 3. Physical-device checklist

Real = wired to the API today. MOCK = local in-memory mock, do not promise it in the demo.

| # | Step | Expected result | Wired? | Pass/Fail |
|---|------|-----------------|--------|-----------|
| 1 | Sign up with email + password (6+ chars) | Lands in the signed-in tabs, no email confirmation step | Real (Supabase) | |
| 2 | Force-quit and reopen app | Still signed in (session in SecureStore) | Real | |
| 3 | Sign out, sign in again | Returns to signed-in tabs | Real | |
| 4 | Create a group | Group appears in Groups list | Real (API) | |
| 5 | Create an invite | Invite link `gather://invite/<token>` shown, Share works | Real | |
| 6 | Second account: sign up, open link or paste token, Join | Joins; group appears for account B | Real | |
| 7 | Set preferences and availability, save | Saved; values still present after force-quit and reopen | Real (`/v1/me/preferences`, `/v1/me/availability`) | |
| 8 | Toggle learning opt-out | Toggle persists as the screen implies | Verify on device | |
| 9 | Deny the notification permission prompt | Onboarding continues, app usable | Real OS prompt | |
| 10 | Start planning for the group | Run starts; up to 3 proposals shown | Real (API + planner) | |
| 11 | Check proposal text | No other member's private availability or preference history visible | Real | |
| 12 | Vote Yes on a proposal | Vote accepted, my choice reflected | Real | |
| 13 | Other account: vote Can't make it | Accepted; distinct from veto | Real | |
| 14 | Veto (separate control, confirm prompt) | Veto recorded separately from Can't make it | Real | |
| 15 | Once majority is met, open Events | Confirmed event visible to all members, including the one who declined | Real (`confirmed-event`) | |
| 16 | Weekly schedule settings | Timezone + weekly toggle load from and save to the backend; no auto-planning | Real (`/v1/groups/:id/schedule`), not yet run live | |
| 17 | Vote tally / counts / deadline display | Rendered from mobile-local stub, not backend data | MOCK | |
| 18 | Notifications feed | Confirmed-event items from the backend; empty list shows "No notifications yet." | Real (`/v1/me/notifications`), not yet run live | |
| 19 | ICS export | "Add to calendar (.ics)" fetches the text, writes a real .ics file to the cache and opens the OS share sheet (user chooses where to save or open it) | Real (`/v1/events/:id/calendar.ics`); not verified on a device and not imported into a real calendar | |
| 20 | Push device registration | Not implemented (permission request only) | MOCK / absent | |

Rows 17 and 20 and "Suggest another" (disabled control), aggregate attendance counts, the inclusion-aware alternative, and revision/revote flows are not demo-able today. Do not promise them (the ICS export and in-app feed rows 18-19 are wired but unverified until run on a device). SPEC §3 "ICS export works on the demo device" is not yet confirmed: the .ics file has not been opened or imported on a real device or calendar.

## 4. Known limitations and fallback

- Contract gaps (no route or DTO yet): vote tally, push registration, "Suggest another". See `docs/gate1-dev1-exit.md`.
- The API is a local dev machine on a LAN: it is up only while `pnpm --filter @gather/api dev` runs, and HTTP is cleartext (fine in Expo Go; a release build would need HTTPS).
- Pending invite token is held and joined by whoever signs in next; avoid opening an invite link while signed out on a shared phone.

Fallback if the API or Supabase is down:

1. Stop Metro, unset or remove all three `EXPO_PUBLIC_*` variables in `apps/mobile/.env`, run `pnpm --filter @gather/mobile start -- --clear`.
2. The app falls back to in-memory mock auth and mock clients (dev builds only: `__DEV__` is true). **Release builds do not have this fallback** and show an explicit config error instead.
3. Mock demo: any valid-looking email and a 6+ char password, join with seed token `seed-invite`, walk through setup, planning, voting, confirmed event. State is in memory and lost on restart.
4. Say plainly that this is mock data. Also keep a screen recording of a successful real run as a second fallback (not yet recorded).

## 5. Troubleshooting

- App cannot reach the API: `EXPO_PUBLIC_API_URL` must be the machine IP, not `localhost`; confirm `/v1/health` opens in the phone browser; check firewall on the API machine; confirm `HOST` is not `127.0.0.1`.
- Expo Go cannot connect to Metro: same Wi-Fi, or `-- --tunnel`.
- Changed `.env` but nothing changed: restart Metro with `--clear`.
- Config error screen at startup: one of the `EXPO_PUBLIC_*` values is missing (Supabase set without API URL is also an error).
- Sign-up succeeds but no session / stuck: Supabase **Confirm email** is still on.
- 401 from the API: session expired or was issued by a different Supabase project than the API's `SUPABASE_*` env. Sign out and in; verify the API and mobile point at the same project.
- Magic link, OTP, and SMTP setup are no longer relevant; auth is email + password.
- CORS: the API registers `@fastify/cors` with `origin: true` (`apps/api/src/app.ts`), so it is not an issue for native Expo Go; it only matters for Expo web.
