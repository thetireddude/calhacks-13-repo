# Current Project State — Gather

## Milestone

**Gate 1** — autonomous orchestration active (ORCH-001). **Do not wait for user** to name next task.

## Completed deliverables (what shipped)

| Task | Deliverable |
|------|-------------|
| GATE0-001 | pnpm monorepo + CI stub |
| GATE0-002 | `@gather/contracts` PlannerPort + planner DTO stubs |
| GATE0-003 | ADR-002 — Gate 1 may use contract stubs |
| DEV2-001 | Fastify API + public `/v1/health` |
| DEV2-002 | JWT auth + protected `/v1/me` + local Supabase config |
| **DEV2-003** | **SQL migrations: `profiles`, `groups`, `group_memberships`, `group_invitations` + member-only RLS stubs** |
| DEV1-001 | Expo SDK 58 app |
| DEV1-002 | React Navigation: Welcome / Home / Groups placeholders |
| DEV3-001 | `createPlanner()` stub (≤3 proposals, tests) |

## In flight

| Task | Deliverable expected |
|------|----------------------|
| DEV2-004 | `member_preferences` + `member_availability` migrations (**candidate on main — finish R/T then mark done**) |
| DEV1-003 | OTP mock auth screens in mobile app |
| DEV3-003 | Seeded activity fallback in planner package |

## Next auto-queue (Dev 2 spine)

1. DEV2-005 — REST: create/join group, invites, members (uses DEV2-003 schema)
2. DEV2-006 — REST: GET/PUT preferences + availability + privacy tests
3. DEV2-007 — planning_runs + proposals tables + route stubs
4. DEV2-008 — wire `@gather/planner` mock into API orchestration
5. DEV2-009 — vote + confirmed-event skeleton routes

## Blockers (SPEC §11)

Voting majority, scheduler, final DTO enums — stub only until approved.

## Orchestration

[`docs/orchestration-runbook.md`](docs/orchestration-runbook.md) — completion messages must describe **what shipped**.
