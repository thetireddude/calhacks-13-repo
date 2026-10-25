# Task Index — Gather

Human-readable status. Detailed state: [`state/CURRENT.md`](../state/CURRENT.md). Graph: [`docs/roadmap.md`](../docs/roadmap.md).

## Foundation

| Task | Status | Depends on | Lane | Notes |
|------|--------|------------|------|-------|
| META-001 | done | — | integration | Agent workflow + scaffold |
| GATE0-001 | done | META-001 | integration | Root workspace + CI stub |
| GATE0-002 | done | GATE0-001 | core-api | Merged `76a97e7` — planner stubs |

## Developer readiness (Gate 1 prep)

| Task | Status | Depends on | Lane | Notes |
|------|--------|------------|------|-------|
| DEV1-001 | done | GATE0-001 | mobile | Merged `9777545` — Expo SDK 58 |
| DEV2-001 | done | GATE0-001 | core-api | Merged `e7adadb` — Fastify `/v1/health` |
| DEV1-002 | done | DEV1-001 | mobile | Merged `6b8a2d0` — React Navigation shell |
| DEV2-002 | done | DEV2-001 | core-api | Merged `8746bf2` — JWT + `/v1/me` |
| GATE0-003 | done | GATE0-002 | integration | ADR-002 contract stub ack for Gate 1 |
| DEV2-003 | done | DEV2-002, GATE0-003 | core-api | **Profiles/groups/memberships/invites SQL + RLS stubs** (`f8c18fb`) |
| DEV2-004 | done | DEV2-003 | core-api | **`member_preferences` + `member_availability` with owner-only RLS** |
| DEV2-005 | done | DEV2-003 | core-api | In-memory groups/invites/join/members API (`52a23cb`) |
| DEV3-001 | done | GATE0-001, GATE0-002 | planner | `createPlanner()` stub + 4 tests (`5d1af3e`) |
| DEV3-002 | done | DEV3-001 | planner | Covered by DEV3-001 PlannerPort impl |
| DEV1-003 | done | DEV1-002 | mobile | **Email + OTP mock auth** (`5769309`; reviewer APPROVE) |
| DEV3-003 | done | DEV3-002 | planner | Seeded discovery fallback (`1e65ed7`) |
| DEV1-004 | implementing | DEV1-003 | mobile | Group UI + mock API client |
| DEV2-006 | done | DEV2-004, DEV2-005 | core-api | Prefs + availability API + privacy tests (merged) |
| DEV2-007 | done | DEV2-004 | core-api | Planning runs migration + route stubs (merged) |
| DEV3-004 | done | DEV3-003 | planner | Approved-weight scoring stub on `main` (merged) |

## How to pick work

1. Read `AGENTS.md` and your [`docs/developers/`](../docs/developers/) brief.
2. Only take tasks whose dependencies are `done` and status is `ready`.
3. Update task **Status** and `state/CURRENT.md` when starting or finishing.

Template: [`TASK_TEMPLATE.md`](TASK_TEMPLATE.md)

Milestone DAG: [`docs/milestone-dag.md`](../docs/milestone-dag.md). Orchestration: `state/agents/ORCH-001.md`.
