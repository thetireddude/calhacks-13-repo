# Gather API (`apps/api`)

**Owner:** Developer 2  
**Branch:** `feature/core-api`

Node.js + TypeScript (Fastify) HTTP API and planning orchestration. See [`docs/developers/developer-2-backend.md`](../../docs/developers/developer-2-backend.md) and SPEC §4 / §6.2.

**Mobile (Dev 1):** how to call this API — [`docs/dev2-api-for-mobile.md`](../../docs/dev2-api-for-mobile.md).

## Local development (Developer 2)

End-to-end setup: [`docs/dev2-local-setup.md`](../../docs/dev2-local-setup.md).

```bash
pnpm install
supabase start && supabase db reset   # repo root; requires Docker
cp .env.example .env                  # fill from supabase status
pnpm run test:ci                      # 29/29 — no running API required
pnpm --filter @gather/api run dev     # needs SUPABASE_JWT_SECRET for protected routes
```

Environment reference: root [`.env.example`](../../.env.example). Supabase schema and migrations: [`supabase/README.md`](../../supabase/README.md).

## Gate 1 status

Through **DEV2-009**: auth, groups, private member setup, mock planner workflow, vote/veto/confirmed-event skeleton. Persistence for handlers is **in-memory**; Supabase schema lives under `supabase/migrations/`.

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm run dev` | Watch mode (`tsx`) |
| `pnpm run build` / `pnpm start` | Compile to `dist/` and run |
| `pnpm test` | Build + run `node:test` suite in this package |
| `pnpm run typecheck` | `tsc --noEmit` |

From **repo root**, Dev 2 CI parity:

```bash
pnpm run test:ci
# alias: pnpm run test:dev2
```

Runs `@gather/contracts` build, API typecheck, and API tests (**27** cases, includes migration smoke). Does not require Supabase running or a populated `.env`.

## Implemented routes (Gate 1)

Auth: all routes below except health require `Authorization: Bearer <JWT>` verified with `SUPABASE_JWT_SECRET`.

| Method | Path | Notes |
|--------|------|--------|
| GET | `/v1/health` | Public liveness |
| GET | `/v1/me` | Current user stub profile |
| POST | `/v1/groups` | Create group |
| GET | `/v1/groups/:groupId` | Member only |
| POST | `/v1/groups/:groupId/invites` | Member only |
| POST | `/v1/invites/:token/join` | Join via invite token |
| GET | `/v1/groups/:groupId/members` | Member only |
| GET | `/v1/me/preferences` | Private to caller |
| PUT | `/v1/me/preferences` | Private to caller |
| GET | `/v1/me/availability` | Private to caller |
| PUT | `/v1/me/availability` | Private to caller |
| POST | `/v1/groups/:groupId/planning-runs` | Creates run + mock generate |
| POST | `/v1/planning-runs/:runId/generate` | Retry generation |
| GET | `/v1/planning-runs/:runId` | Run status |
| GET | `/v1/planning-runs/:runId/proposals` | ≤3 ranked proposals |
| PUT | `/v1/proposals/:proposalId/vote` | `approve` \| `cant_make_it` |
| POST | `/v1/proposals/:proposalId/veto` | Explicit veto (distinct from vote) |
| GET | `/v1/groups/:groupId/confirmed-event` | Stub majority confirmation |

Registration: `apps/api/src/app.ts` plus `groups/`, `me/`, `planning/`, `voting/` route modules.

## Tests

| File | Coverage |
|------|----------|
| `health.test.ts` | Health |
| `auth.test.ts` | JWT + `/v1/me` |
| `groups.test.ts` | Groups, invites, join, members |
| `me.test.ts` | Preferences, availability, privacy |
| `planning.test.ts` | Runs, mock planner, cap 3, failure retry |
| `voting.test.ts` | Vote, veto, confirmation idempotency |
| `migrations.smoke.test.ts` | SQL migration shape + order |

## Not in Gate 1

Weekly scheduler, notifications, ICS, Supabase-backed stores, and remaining SPEC §6.2 routes — tracked post–Gate 1 / SPEC §11.
