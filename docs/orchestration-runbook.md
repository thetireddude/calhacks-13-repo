# Orchestration runbook (AGENTS.md compliance)

Every task must follow this loop unless the task file sets `review required: no` / `tester required: no`.

## Per-task checklist

1. **Orchestrator** confirms dependencies in `tasks/index.md` + `state/CURRENT.md`.
2. Create/update **`state/task-context/<TASK-ID>.md`** before any implementer runs.
3. Create **`state/agents/<TASK-ID>.md`** → status `IMPLEMENTING`.
4. **Implementer** works in assigned worktree/branch; only **allowed files**; sets task status → **`candidate`**; writes handoff in task file.
5. **Reviewer** (separate pass): verdict APPROVE / CHANGES REQUIRED; no open P0/P1.
6. **Tester** (if required): gate PASS / FAIL.
7. **Orchestrator** merges only after gates pass; task → **`done`**; update `tasks/index.md`, `state/CURRENT.md`; archive/delete `state/agents/<TASK-ID>.md`.

## Orchestrator must not

- Implement feature code in `apps/*`, `packages/*`, `supabase/*` except integration-only root (GATE0-001-class).
- Merge `candidate` → `main` without recorded review/test when the task requires them.

## Lane ownership (SPEC)

- Dev 2: `apps/api`, `supabase`, `packages/contracts`
- Dev 1: `apps/mobile`
- Dev 3: `packages/planner`

Cross-lane merges require contract review (**GATE0-003**).
