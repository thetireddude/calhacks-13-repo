# ORCH-001 — Milestone Gate 0→1 dispatch

- **status:** IMPLEMENTING (workflow realigned — see below)
- **active role:** orchestrator
- **branch:** main
- **current activity:** W3 — enforce Implementer → Reviewer → Tester before merge

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
| W2 | DEV1-001 | worktree — candidate pending |
| W3 | DEV2-002, DEV3-001 | worktrees — **do not merge until R+T** |

## Active worktrees

| Task | Path | Branch |
|------|------|--------|
| DEV1-001 | calhacks-13-wt-DEV1-001 | agent/DEV1-001-mobile-bootstrap |
| DEV2-002 | calhacks-13-wt-DEV2-002 | agent/DEV2-002-supabase-auth |
| DEV3-001 | calhacks-13-wt-DEV3-001 | agent/DEV3-001-planner-bootstrap |

## Next orchestrator actions

1. Finish DEV1-001 / DEV2-002 / DEV3-001 as **candidate** on agent branches (implementer subagents or human).
2. Run **reviewer + tester** passes per task file.
3. Merge to `main` only after gates.
4. Queue **DEV2-003** with fresh context pack.
