# Current Project State — Gather

## Milestone

**Gate 1** — Wave 6 dispatched (ORCH-001): **DEV1-004** ∥ **DEV2-006** ∥ **DEV2-007** ∥ **DEV3-004**.

## Completed deliverables (what shipped)

| Task | Deliverable |
|------|-------------|
| GATE0-001 | pnpm monorepo + CI stub |
| GATE0-002 | `@gather/contracts` PlannerPort + planner DTO stubs |
| GATE0-003 | ADR-002 — Gate 1 may use contract stubs |
| DEV2-001 | Fastify API + public `/v1/health` |
| DEV2-002 | JWT auth + protected `/v1/me` + local Supabase config |
| DEV2-003 | SQL: profiles, groups, memberships, invitations + RLS |
| DEV2-004 | SQL: member_preferences + member_availability + owner RLS |
| DEV2-005 | In-memory groups/invites/join/members REST + group DTOs |
| DEV2-006 | GET/PUT `/v1/me/preferences` and availability + privacy tests |
| DEV1-001 | Expo SDK 58 app |
| DEV1-002 | React Navigation shell |
| DEV1-003 | Email + OTP mock auth |
| DEV3-001 | `createPlanner()` stub |
| DEV3-003 | Seeded discovery fallback in planner |
| DEV3-004 | Approved-weight scoring stub wired in `createPlanner` |

## In flight (implementers dispatched)

| Task | Expected deliverable |
|------|----------------------|
| DEV1-004 | Group create/list/join UI + mock API client |
| DEV2-007 | planning_runs/proposals migration + planning route stubs |

## Next after W6 gates

- DEV2-008 — wire planner into API
- DEV1-005 — member setup UI (after DEV1-004)
- Parallel W7 per `docs/milestone-dag.md`

## Blockers (SPEC §11)

Voting majority, scheduler, full score formulas — stub only.

## Orchestration

[`docs/orchestration-runbook.md`](docs/orchestration-runbook.md)
