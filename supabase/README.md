# Supabase

**Owner:** Developer 2 (`feature/core-api`)

## Local setup

**Runbook:** [`docs/dev2-local-setup.md`](../docs/dev2-local-setup.md) (install deps → `supabase start` → `supabase db reset` → `.env` from `supabase status` → `pnpm run test:ci`).

1. Install [Supabase CLI](https://supabase.com/docs/guides/cli) and ensure Docker is running.
2. From repo root: `supabase start` (uses `supabase/config.toml`, project id `gather-local`, API port **54321**).
3. Apply migrations: `supabase db reset`.
4. Copy keys from `supabase status` into root `.env` (see [`.env.example`](../.env.example)):

   | Status field | Env var |
   |--------------|---------|
   | API URL | `SUPABASE_URL` |
   | anon key | `SUPABASE_ANON_KEY` |
   | service_role key | `SUPABASE_SERVICE_ROLE_KEY` |
   | JWT secret | `SUPABASE_JWT_SECRET` (required for API JWT verification in `apps/api/src/auth.ts`) |

   Gate 2 DB-backed API paths also need `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` when that mode is enabled; CI tests use in-memory stores without a running database.

## Migrations (four files)

Apply from repo root: `supabase db reset` or `supabase migration up`.

| Migration | Task | Tables |
|-----------|------|--------|
| `20261024180000_identity_and_groups.sql` | DEV2-003 | `profiles`, `groups`, `group_memberships`, `group_invitations` |
| `20261024180100_preferences_availability.sql` | DEV2-004 | `member_preferences`, `member_availability` |
| `20261024180200_planning_runs.sql` | DEV2-007 | `planning_runs`, `proposals` |
| `20261024180300_votes_confirmed_events.sql` | DEV2-009 | `proposal_votes`, `proposal_vetoes`, `confirmed_events` |

Ordering is enforced by filename timestamps; smoke test: `apps/api/src/migrations.smoke.test.ts`.

## Row level security (Gate 1)

All listed tables have RLS enabled. Policies are **Gate 1 stubs** — tighten before production/demo.

### Private (member-owned only)

| Table | Policy intent |
|-------|----------------|
| `member_preferences` | `auth.uid() = user_id` for all operations |
| `member_availability` | `auth.uid() = user_id` for all operations |

Other members and group APIs must **not** expose raw preference or availability rows (API enforces caller scope in tests: `me.test.ts`).

### Group-visible (members of the owning group)

| Table | Policy intent |
|-------|----------------|
| `profiles` | Select/update own profile |
| `groups`, `group_memberships`, `group_invitations` | Select when user is a member (invites: minimal stub) |
| `planning_runs`, `proposals` | Select (and insert runs) when user is a group member |
| `proposal_votes`, `proposal_vetoes`, `confirmed_events` | Select when user is member of the proposal’s group; votes/vetoes write own `user_id` |

## API vs database (Gate 1)

REST handlers in `apps/api` use **in-memory stores** for Gate 1 speed; the schema above is the persistence target for post–Gate 1 wiring.

## Docs

- Gate 1 exit checklist: [`docs/gate1-dev2-exit.md`](../docs/gate1-dev2-exit.md)
- Evidence matrix: [`state/GATE1-DEV2-EXIT.md`](../state/GATE1-DEV2-EXIT.md)
