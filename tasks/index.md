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
| DEV1-002 | implementing | DEV1-001 | mobile | Navigation shell (W3) |
| DEV2-002 | implementing | DEV2-001 | core-api | Supabase + JWT (W3 worktree) |
| DEV3-001 | done | GATE0-001, GATE0-002 | planner | Merged `5d1af3e` — createPlanner + 4 tests |

## How to pick work

1. Read `AGENTS.md` and your [`docs/developers/`](../docs/developers/) brief.
2. Only take tasks whose dependencies are `done` and status is `ready`.
3. Update task **Status** and `state/CURRENT.md` when starting or finishing.

Template: [`TASK_TEMPLATE.md`](TASK_TEMPLATE.md)

Milestone DAG: [`docs/milestone-dag.md`](../docs/milestone-dag.md). Orchestration: `state/agents/ORCH-001.md`.
