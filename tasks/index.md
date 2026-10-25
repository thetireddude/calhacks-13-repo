# Task Index — Gather

Human-readable status. Detailed state: [`state/CURRENT.md`](../state/CURRENT.md). Graph: [`docs/roadmap.md`](../docs/roadmap.md).

## Foundation

| Task | Status | Depends on | Lane | Notes |
|------|--------|------------|------|-------|
| META-001 | done | — | integration | Agent workflow + scaffold |
| GATE0-001 | ready | META-001 | integration | Root workspace + CI stub |
| GATE0-002 | ready | GATE0-001 | core-api | Contract type stubs |

## Developer readiness (Gate 1 prep)

| Task | Status | Depends on | Lane | Notes |
|------|--------|------------|------|-------|
| DEV1-001 | blocked | GATE0-001 | mobile | Expo bootstrap |
| DEV2-001 | blocked | GATE0-001 | core-api | API bootstrap |
| DEV3-001 | blocked | GATE0-001, GATE0-002 | planner | Planner package stub |

## How to pick work

1. Read `AGENTS.md` and your [`docs/developers/`](../docs/developers/) brief.
2. Only take tasks whose dependencies are `done` and status is `ready`.
3. Update task **Status** and `state/CURRENT.md` when starting or finishing.

Template: [`TASK_TEMPLATE.md`](TASK_TEMPLATE.md)

## Proposed milestone DAG (awaiting approval)

Full graph, parallel waves, and Dev 2 critical path:

**[`docs/milestone-dag.md`](../docs/milestone-dag.md)** — Gate 0 → Gate 1 task IDs (`GATE0-*`, `DEV2-*`, `DEV1-*`, `DEV3-*`, `GATE1-EXIT`).

Do not create implementation task files until the team approves that document.
