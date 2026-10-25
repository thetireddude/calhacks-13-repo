# Orchestration runbook (AGENTS.md compliance)

**Non-negotiable:** Each role is a **separate dispatch** (subagent or human). The orchestrator coordinates; it does not substitute for Reviewer or Tester.

## Role dispatch sequence

```text
Orchestrator → context pack + state/agents/<TASK-ID>.md
  → Implementer (Task) → candidate + commit on agent branch
  → Reviewer (Task) → verdict in state/agents/<TASK-ID>.md  [required if task says yes]
  → Tester (Task) → PASS/FAIL in state/agents/<TASK-ID>.md   [required if task says yes]
  → Orchestrator merge → done + deliverable message + index/CURRENT
```

| Role | Reads | Must not |
|------|--------|----------|
| Orchestrator | `agents/orchestrator.md`, DAG, `state/CURRENT.md` | Implement feature code; approve own code as Reviewer |
| Implementer | `agents/implementer.md`, task, context pack | Merge to `main`; skip to done |
| Reviewer | `agents/reviewer.md`, diff, tests | Commit production fixes unless assigned |
| Tester | `agents/tester.md`, task test requirements | Weaken tests to pass |

## Completion messages (user-visible)

```text
<task-id> complete: <what shipped in plain English> (commit <hash>)
```

Include what is **not** included yet.

## Autonomous orchestration

After gates pass, orchestrator unlocks next ready tasks and dispatches **Implementer** without waiting for the user. **Still runs Reviewer + Tester** before every merge.

## Per-task checklist

1. Dependencies complete; `state/task-context/<TASK-ID>.md` exists.
2. `state/agents/<TASK-ID>.md` — track IMPLEMENTING → CANDIDATE → REVIEWING → TESTING → APPROVED → MERGED.
3. Implementer → **candidate** only.
4. Reviewer → record verdict + P0–P3 in `state/agents/<TASK-ID>.md`.
5. Tester → record gate + **must run `pnpm run test:ci`** in the candidate worktree (see `agents/tester.md` CI parity). Paste pass/fail counts; no merge on FAIL or CI-red.
6. Merge only if APPROVE (+ PASS when tester required) **and** GitHub Actions green on the PR branch (or orchestrator re-runs CI after merge commit).
7. Task **done**; update `tasks/index.md`, `state/CURRENT.md`.

## Retroactive gaps

Tasks merged without Reviewer/Tester must get **retro R+T** before dependent tasks merge, or be reverted.
