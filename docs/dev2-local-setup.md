# Developer 2 — local setup (Core API + Supabase)

**Lane:** `feature/core-api`  
**Owner surfaces:** `apps/api/`, `supabase/`, `packages/contracts/`

This runbook is the canonical path for Gate 2 local work: Supabase CLI, migrations, API environment, and CI-parity tests. Deeper API route inventory lives in [`apps/api/README.md`](../apps/api/README.md); schema and RLS notes in [`supabase/README.md`](../supabase/README.md).

## Prerequisites

| Tool | Version / notes |
|------|-----------------|
| Node.js | 20+ (`engines` in root `package.json`) |
| pnpm | 9 (`corepack enable` then use repo `packageManager`) |
| Docker | Required for local Supabase (CLI runs containers) |
| [Supabase CLI](https://supabase.com/docs/guides/cli) | Install globally or use `pnpm exec supabase` from repo root (devDependency) |

## Quick start (ordered steps)

From the **repository root**:

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Start local Supabase (Docker must be running)
supabase start

# 3. Apply all migrations on a clean database
supabase db reset

# 4. Configure environment (see table below)
cp .env.example .env
# Fill values from: supabase status

# 5. CI parity — must pass without a running API server
pnpm run test:ci
```

Expected test result today: **29/29** passing (`@gather/api` `node:test` suite + contracts build + typecheck). CI does **not** require `supabase start`; tests use in-memory stores and inline JWT secrets unless you opt into DB-backed behavior (Gate 2).

## Environment variables (Gate 2 local dev)

Copy [`.env.example`](../.env.example) to `.env` at the repo root. **Never commit `.env`.**

After `supabase start`, run:

```bash
supabase status
```

Map CLI output to `.env` as follows:

| `.env` variable | `supabase status` label | Required for | Notes |
|-----------------|-------------------------|--------------|-------|
| `SUPABASE_URL` | **API URL** | DB-backed groups (Gate 2), mobile against local stack | Typically `http://127.0.0.1:54321` (`supabase/config.toml` `[api].port`) |
| `SUPABASE_ANON_KEY` | **anon key** | Mobile / client auth (Dev 1); optional for API-only Dev 2 | Public client key; still do not commit real prod keys |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role key** | Supabase admin client in API when env-gated persistence is enabled | Server-only; bypasses RLS — keep local |
| `SUPABASE_JWT_SECRET` | **JWT secret** | Running API with real Supabase-issued JWTs (`apps/api/src/auth.ts`) | HS256 verification for `Authorization: Bearer` |
| `SUPABASE_JWT_ISSUER` | *(optional)* | Stricter JWT checks when set (Gate 2) | Local issuer is usually `http://127.0.0.1:54321/auth/v1` — only set when testing iss validation |
| `SUPABASE_JWT_AUDIENCE` | *(optional)* | Stricter JWT checks when set (Gate 2) | Often `authenticated` for Supabase Auth — only set when testing aud validation |
| `API_PORT` | — | Documentation / client defaults | Align with where you run the API (default **3000**) |
| `API_PUBLIC_URL` | — | Mobile `EXPO_PUBLIC_API_URL`, invite links | e.g. `http://localhost:3000` |
| `PORT` | — | `pnpm run dev` / `pnpm start` in `apps/api` | Binds HTTP server (`apps/api/src/index.ts`); defaults to **3000** if unset |
| `HOST` | — | Optional bind address | Defaults to `0.0.0.0` |

Planner provider keys (`CREAO_API_KEY`, `BRIGHT_DATA_API_KEY`) are optional until real planner integration; CI and Gate 2 API work do not require them.

### Minimal `.env` for `pnpm run test:ci`

**None.** The Dev 2 CI script does not load `.env` for tests; the suite sets `SUPABASE_JWT_SECRET` in test setup and uses in-memory persistence. You still want a filled `.env` when running `pnpm --filter @gather/api run dev` against local Supabase.

### Minimal `.env` for local API + Supabase Auth

```env
SUPABASE_JWT_SECRET=<from supabase status → JWT secret>
```

### Full Gate 2 local stack (API + DB-backed groups when implemented)

Set all of:

```env
SUPABASE_URL=<API URL>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
SUPABASE_JWT_SECRET=<JWT secret>
```

Add optional iss/aud lines only when exercising hardened auth paths.

## Supabase commands (repo root)

| Command | Purpose |
|---------|---------|
| `supabase start` | Start local stack (`supabase/config.toml`, project id `gather-local`) |
| `supabase stop` | Stop containers |
| `supabase status` | Print URLs and keys for `.env` |
| `supabase db reset` | Drop/recreate DB and apply `supabase/migrations/*.sql` in order |
| `supabase migration list` | Inspect applied migrations |

Migration filenames and table inventory: [`supabase/README.md`](../supabase/README.md).

## Running the API locally

```bash
# From repo root — ensure SUPABASE_JWT_SECRET is set if hitting protected routes
pnpm --filter @gather/api run dev
```

Public check:

```bash
curl -s http://localhost:3000/v1/health
```

Protected routes need a Supabase Auth JWT signed with the same secret as `SUPABASE_JWT_SECRET` (use Supabase Auth locally or test helpers in `apps/api/src/*.test.ts`).

## CI parity script

Root script (same as `.github/workflows/ci.yml` Dev 2 gate):

```bash
pnpm run test:ci
```

Equivalent to `pnpm run test:dev2`. Runs:

1. `pnpm --filter @gather/contracts build`
2. `pnpm --filter @gather/api typecheck`
3. `pnpm --filter @gather/api test` (build + **27** tests, includes migration smoke)

## Troubleshooting

| Symptom | Check |
|---------|--------|
| `supabase start` fails | Docker running; ports **54321** / **54322** free |
| `SUPABASE_JWT_SECRET is not configured` at runtime | Export secret in shell or `.env` loaded by your process manager |
| `401` on API with local JWT | JWT signed with local **JWT secret** from `supabase status`, not a prod secret |
| Tests pass locally but DB empty | Expected for default CI path — persistence is env-gated in Gate 2 |
| `supabase db reset` errors | Run from repo root; review migration SQL under `supabase/migrations/` |

## Related docs

- [Developer 2 brief](developers/developer-2-backend.md)
- [Gate 1 Dev 2 exit](../state/GATE1-DEV2-EXIT.md)
- Task: [`tasks/DEV2-013-local-dev-dx.md`](../tasks/DEV2-013-local-dev-dx.md)
