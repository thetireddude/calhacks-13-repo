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
| DEV2-010 | Gate 1 exit docs, CI `test:dev2`, checklist vs SPEC §8 |

## Milestone

**Gate 1 Developer 2 — complete** (DEV2-001–010). Evidence: [`state/GATE1-DEV2-EXIT.md`](GATE1-DEV2-EXIT.md), [`docs/gate1-dev2-exit.md`](../docs/gate1-dev2-exit.md).

## Next (Gate 2 prep)

Supabase persistence wiring, import real `@gather/planner` when Dev 3 lands, SPEC §11 when approved.

## Test status

`pnpm run test:dev2` — **27/27** pass. See [`state/DEV2-TEST-STATUS.md`](DEV2-TEST-STATUS.md).

## Blockers (SPEC §11)

Voting rules, scheduler, full DTO freeze — stub until approved.
