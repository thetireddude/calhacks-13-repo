# Orchestration runbook (AGENTS.md compliance)

Every task must follow this loop unless the task file sets `review required: no` / `tester required: no`.

## Completion messages (user-visible)

When a task moves to **done**, state **what shipped**, not only the task ID:

```text
<task-id> complete: <one sentence deliverable> — e.g. "Postgres tables for groups + RLS stubs in supabase/migrations"
```

Also record: commit hash, lane, and what is **explicitly not** included yet.

## Autonomous orchestration (ORCH-001)

The orchestrator **does not wait** for the user to request the next task. After gates pass:

1. Merge to `main`
2. Unlock next DAG nodes in `tasks/index.md` + `state/CURRENT.md`
3. Dispatch or implement the next **ready** wave without prompting

## Per-task checklist

1. **Orchestrator** confirms dependencies in `tasks/index.md` + `state/CURRENT.md`.
2. Create/update **`state/task-context/<TASK-ID>.md`** before any implementer runs.
3. Create **`state/agents/<TASK-ID>.md`** → status `IMPLEMENTING`.
4. **Implementer** works in assigned worktree/branch; only **allowed files**; sets task status → **`candidate`**; writes handoff in task file.
5. **Reviewer** (separate pass): verdict APPROVE / CHANGES REQUIRED; no open P0/P1.
6. **Tester** (if required): gate PASS / FAIL.
7. **Orchestrator** merges only after gates pass; task → **`done`** with deliverable summary; update index/state; archive `state/agents/<TASK-ID>.md`.

## Orchestrator must not

- Implement feature code in `apps/*`, `packages/*`, `supabase/*` except integration-only root (GATE0-001-class) **unless no implementer is available** — then implement, still run R+T, document in handoff.
- Merge `candidate` → `main` without recorded review/test when the task requires them.

## Lane ownership (SPEC)

- Dev 2: `apps/api`, `supabase`, `packages/contracts`
- Dev 1: `apps/mobile`
- Dev 3: `packages/planner`

Cross-lane merges require contract review (**GATE0-003**).
