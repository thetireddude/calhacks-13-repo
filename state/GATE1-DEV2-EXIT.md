# GATE1-DEV2-EXIT — checklist and evidence

**Task:** DEV2-010  
**Last verified:** `pnpm run test:dev2` — **27/27 pass**

## Checklist vs SPEC §8 (Developer 2)

- [x] **Authentication and Supabase schema** — OTP/JWT path via `requireAuth` (`apps/api/src/auth.ts`); `SUPABASE_JWT_SECRET` documented in `.env.example`; migrations `20261024180000` … `20261024180300`.
- [x] **API skeleton** — `GET /v1/health`, `GET /v1/me`, groups/invites/join/members, `GET/PUT /v1/me/preferences|availability`, planning run + proposal routes, vote/veto/confirmed-event routes (in-memory stores Gate 1).
- [x] **Planning workflow (mocked planner)** — `apps/api/src/planner/mockPlannerPort.ts`, orchestration in `planning/orchestrate.ts`, cap 3 proposals, failure + retry (`planning.test.ts`).
- [x] **Independent build/test** — `pnpm run test:dev2` (contracts build + API typecheck + API tests).
- [x] **Frozen public interfaces** — `PlannerPort` and route DTOs from `@gather/contracts`; no private planner imports.

## Route evidence (implemented Gate 1)

| Method | Path | Module | Test file |
|--------|------|--------|-----------|
| GET | `/v1/health` | `app.ts` | `health.test.ts` |
| GET | `/v1/me` | `app.ts` | `auth.test.ts` |
| POST | `/v1/groups` | `groups/routes.ts` | `groups.test.ts` |
| GET | `/v1/groups/:groupId` | `groups/routes.ts` | `groups.test.ts` |
| POST | `/v1/groups/:groupId/invites` | `groups/routes.ts` | `groups.test.ts` |
| POST | `/v1/invites/:token/join` | `groups/routes.ts` | `groups.test.ts` |
| GET | `/v1/groups/:groupId/members` | `groups/routes.ts` | `groups.test.ts` |
| GET/PUT | `/v1/me/preferences` | `me/routes.ts` | `me.test.ts` |
| GET/PUT | `/v1/me/availability` | `me/routes.ts` | `me.test.ts` |
| POST | `/v1/groups/:groupId/planning-runs` | `planning/routes.ts` | `planning.test.ts` |
| POST | `/v1/planning-runs/:runId/generate` | `planning/routes.ts` | `planning.test.ts` |
| GET | `/v1/planning-runs/:runId` | `planning/routes.ts` | `planning.test.ts` |
| GET | `/v1/planning-runs/:runId/proposals` | `planning/routes.ts` | `planning.test.ts` |
| PUT | `/v1/proposals/:proposalId/vote` | `voting/routes.ts` | `voting.test.ts` |
| POST | `/v1/proposals/:proposalId/veto` | `voting/routes.ts` | `voting.test.ts` |
| GET | `/v1/groups/:groupId/confirmed-event` | `voting/routes.ts` | `voting.test.ts` |

## Migration evidence (four files)

| File | Tables | Visibility |
|------|--------|--------------|
| `20261024180000_identity_and_groups.sql` | `profiles`, `groups`, `group_memberships`, `group_invitations` | Group-visible to members (RLS) |
| `20261024180100_preferences_availability.sql` | `member_preferences`, `member_availability` | **Private** — owner only |
| `20261024180200_planning_runs.sql` | `planning_runs`, `proposals` | Group-visible to members |
| `20261024180300_votes_confirmed_events.sql` | `proposal_votes`, `proposal_vetoes`, `confirmed_events` | Group-visible to members; vote write own row |

Smoke: `apps/api/src/migrations.smoke.test.ts` (5 cases).

## CI

`.github/workflows/ci.yml`: `pnpm install` → `pnpm typecheck` → `pnpm run test:dev2`.

## Known Gate 1 limitations (not blockers)

- API persistence is in-memory; schema is ahead of runtime wiring.
- Voting majority, deadlines, scheduler — SPEC §11 stubs only.
- RLS policies are minimal; harden before demo/production.
