# Dev 1 — calling the live API

One page for Expo / mobile against a running `apps/api`. Types: `@gather/contracts`. Local stack: [`docs/dev2-local-setup.md`](dev2-local-setup.md).

## Base URL

Default bind: `HOST=0.0.0.0`, `PORT=3000` (`API_PORT` / `API_PUBLIC_URL` in `.env.example` are alignment only).

| Client | `EXPO_PUBLIC_API_URL` |
|--------|------------------------|
| Simulator / same machine | `http://localhost:3000` |
| Physical device | `http://<your-LAN-IP>:3000` — **not** `127.0.0.1` (that is the phone itself) |

Example: `curl -s http://localhost:3000/v1/health` → `{ "status": "ok" }`.

## Auth

All routes except `GET /v1/health` need:

```http
Authorization: Bearer <supabase-access-token>
```

The API verifies HS256 with `SUPABASE_JWT_SECRET` (same secret as local `supabase status`). Optional `SUPABASE_JWT_ISSUER` / `SUPABASE_JWT_AUDIENCE` reject mismatched `iss` / `aud`.

`id` on `/v1/me` is JWT `sub`. **DB mode** (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` set): `profiles.id` references `auth.users(id)`. `sub` **must** be that user’s UUID — sign in via Supabase Auth (OTP). Fake/test subjects work only for in-memory CI (those env vars unset).

## CORS

`@fastify/cors` with `origin: true` (reflects request `Origin`). Auth is unchanged. Expo web / Metro preflight is allowed.

## Errors

JSON body is always `{ "error": "<code>" }`.

| HTTP | `error` | When |
|------|---------|------|
| 401 | `unauthorized` | Missing/invalid Bearer or JWT |
| 403 | `forbidden` | Authenticated but not a group member |
| 404 | `not_found` | Unknown group, invite, run, proposal, or no confirmed event |
| 400 | `invalid_body` | Bad PUT `/v1/me`, preferences, or availability |
| 400 | `invalid_name` | POST `/v1/groups` empty `name` |
| 400 | `invalid_choice` | Vote not `approve` \| `cant_make_it` |
| 409 | `already_completed` | POST generate on a completed run |
| 410 | `invite_expired` | Join after `expiresAt` |

## Routes on this branch

Auth column: JWT required unless noted.

| Method | Path | Notes |
|--------|------|--------|
| GET | `/v1/health` | Public |
| GET | `/v1/me` | `{ id, profile: { displayName } }` |
| PUT | `/v1/me` | Body `{ "profile": { "displayName": string \| null } }` |
| GET | `/v1/groups` | `{ groups }` — memberships for this `sub` only |
| POST | `/v1/groups` | `{ "name": "…" }` → 201 |
| GET | `/v1/groups/:groupId` | Member |
| POST | `/v1/groups/:groupId/invites` | Member → 201 |
| POST | `/v1/invites/:token/join` | JWT; 200 membership |
| GET | `/v1/groups/:groupId/members` | Member |
| GET/PUT | `/v1/me/preferences` | Private to caller (`learningOptIn`, tags, budget, travel) |
| GET/PUT | `/v1/me/availability` | Private to caller (`windows[]`) |
| POST | `/v1/groups/:groupId/planning-runs` | Member; mock generate → 201 |
| POST | `/v1/planning-runs/:runId/generate` | Retry if not completed |
| GET | `/v1/planning-runs/:runId` | Member of run’s group |
| GET | `/v1/planning-runs/:runId/proposals` | `{ proposals }` ≤ 3 |
| PUT | `/v1/proposals/:proposalId/vote` | `{ "choice": "approve" \| "cant_make_it" }` |
| POST | `/v1/proposals/:proposalId/veto` | Distinct from vote |
| GET | `/v1/groups/:groupId/confirmed-event` | 404 if none |

Do not send another member’s preferences or availability in any request. Responses must not include those private fields for other users.

## If present on branch (parallel stubs)

Not registered in `apps/api/src/app.ts` on this checkout. Probe or pull the matching task branch / later `main`:

| Method | Path | Task | Expected |
|--------|------|------|----------|
| GET/PUT | `/v1/groups/:groupId/schedule` | DEV2-021 | Config only `{ timezone, weeklyEnabled }`; no weekly auto-run |
| GET | `/v1/events/:eventId/calendar.ics` | DEV2-022 | `text/calendar` for a **confirmed** event; member JWT |
| GET | `/v1/me/notifications` | DEV2-023 | Group-visible feed; no push; no private prefs/availability |

`POST /v1/me/push-devices` is SPEC inventory only — not implemented here.

## Expo checklist

1. `supabase start` + `pnpm --filter @gather/api run dev` (repo-root `.env` loaded).
2. Same `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` as the API’s Supabase.
3. Sign in; send that session access token as Bearer.
4. On device: phone and laptop on one LAN; API reachable at the LAN IP; `EXPO_PUBLIC_API_URL` rebuilt after change.
