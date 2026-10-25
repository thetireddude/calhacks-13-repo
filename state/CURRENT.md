# Current Project State — Developer 2 (Core API)

## Scope

This branch state tracks **`apps/api/**`, `supabase/**`, `packages/contracts/**` only.** Mobile and planner packages are placeholder stubs until other developers land their lanes.

## Shipped (Dev 2)

| Task | Deliverable |
|------|-------------|
| DEV2-001 | Fastify API + `/v1/health` |
| DEV2-002 | JWT auth + `/v1/me` + Supabase config |
| DEV2-003 | Profiles, groups, memberships, invitations + RLS |
| DEV2-004 | `member_preferences`, `member_availability` + owner RLS |
| DEV2-005 | In-memory groups, invites, join, members REST |
| DEV2-006 | GET/PUT preferences + availability + privacy tests |
| DEV2-007 | `planning_runs` / `proposals` migration + planning route stubs |
| DEV2-008 | Mock `PlannerPort`, persist ≤3 proposals, failed-run retry |
| DEV2-009 | Vote/veto/confirmed-event skeleton + idempotent stub majority |

## Next

Post-DEV2-009 review/test gates; Supabase wiring for votes when scheduled.

## Test status

Run `pnpm run test:dev2` after DEV2-009 (includes voting idempotency + concurrency tests). See [`state/DEV2-TEST-STATUS.md`](DEV2-TEST-STATUS.md).

## Blockers (SPEC §11)

Voting rules, scheduler, full DTO freeze — stub until approved.
