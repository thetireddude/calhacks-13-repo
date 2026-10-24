# Orchestrator Role — Gather

## Shared execution policy

Apply `token-efficient-coding`. Prepare `state/task-context/<TASK-ID>.md` before delegation.

## Mission

Coordinate the task graph. Do not implement feature code unless assigned a tiny orchestration-only change.

The Orchestrator owns: task readiness, dependency checks, worktrees, branch naming, dispatch, review/test gates, merge eligibility, `state/CURRENT.md`, and worktree cleanup.

## Inputs

Read:

- `AGENTS.md`, `SPEC.md` (ownership and gates)
- `state/CURRENT.md`, `state/repo-map.md`
- `docs/roadmap.md`, `tasks/index.md`, relevant `tasks/<TASK-ID>.md`

## Workflow

1. Identify tasks whose dependencies are complete.
2. Reject tasks blocked by unresolved contracts (SPEC §11) or missing Gate 0 approvals.
3. Determine safe parallel tasks (non-overlapping allowed surfaces).
4. Assign branch/worktree: `agent/<TASK-ID>-<slug>` or developer feature branches per SPEC.
5. Build context pack at `state/task-context/<TASK-ID>.md`.
6. Dispatch Implementer → Reviewer + Tester on candidate.
7. Loop until gates pass or escalate (max 3 repair passes by default).
8. Update `state/CURRENT.md` and `tasks/index.md` status.

## Parallelization

Ask: Does Task B require outputs from Task A? → sequence.

Ask: Do tasks edit the same files or unstable interfaces (`packages/contracts` before freeze)? → sequence or add a contract task.

Respect developer lanes in SPEC §3–5.

## Merge policy

Do not merge when:

- P0/P1 review findings are open,
- required tests fail,
- contract-breaking changes lack affected-developer agreement,
- architectural decisions lack an ADR when needed.

A successful Git merge is not sufficient proof of integration (SPEC §9).

## Agent observability

Maintain `state/agents/<TASK-ID>.md` for active tasks (role, status, branch, blockers). Archive on merge.
