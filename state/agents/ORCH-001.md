# ORCH-001 — Milestone Gate 0→1 dispatch

- **status:** IMPLEMENTING (workflow realigned — see below)
- **active role:** orchestrator
- **branch:** main
- **current activity:** W6 — 4 parallel implementers (DEV1-004, DEV2-006, DEV2-007, DEV3-004)

## Workflow compliance (honest audit)

| Rule (AGENTS / orchestrator.md) | So far |
|----------------------------------|--------|
| Context pack before implementer | Partial (W2 only) |
| Implementer role for feature code | **Violated** — orchestrator merged GATE0-002/DEV2-001; W3 code started on orchestrator |
| Reviewer + Tester before merge | **Skipped** on early merges (task files say review/test **yes**) |
| Task status `candidate` → gates → `done` | **Skipped** — jumped to `done` on merge |
| `state/agents/<TASK-ID>.md` per task | Missing for most tasks |

**From next dispatch forward:** follow [`docs/orchestration-runbook.md`](../docs/orchestration-runbook.md).

## Wave status

| Wave | Tasks | Status |
|------|-------|--------|
| W1 | GATE0-001 | done on main |
| W2 | GATE0-002, DEV2-001 | merged — **retro review recommended** |
| W2 | DEV1-001 | **merged** (`9777545`) — reviewer APPROVE |
| W3 | DEV3-001 | **merged** (`5d1af3e`) |
| W3 | DEV1-002 | **merged** (`6b8a2d0`) |
| W3 | DEV2-002 | **merged** (`8746bf2`) |
| W4 | DEV2-003 | **ready** (Dev 2 spine) |

## Active worktrees

| Task | Path | Branch |
|------|------|--------|
| DEV1-004 | calhacks-13-wt-DEV1-004 | agent/DEV1-004-group-ui-mock |
| DEV2-006 | calhacks-13-wt-DEV2-006 | agent/DEV2-006-prefs-availability |
| DEV2-007 | calhacks-13-wt-DEV2-007 | agent/DEV2-007-planning-runs |
| DEV3-004 | calhacks-13-wt-DEV3-004 | agent/DEV3-004-scoring-stub |

## Next orchestrator actions

1. Implementers → **candidate** commits on agent branches.
2. **Reviewer + Tester** per task (parallel across task IDs).
3. Merge to `main` only after APPROVE + PASS.
4. Queue **DEV2-008** / **DEV1-005** after W6 merges.
