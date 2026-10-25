# Project DAG — Gather

Task graph and orchestration rules. **Live status** is always in the repo (`tasks/index.md`, `state/CURRENT.md`, `docs/roadmap.md`), not in external skill copies.

## Source-of-truth hierarchy

When instructions conflict:

1. Explicit requirements in `tasks/<TASK-ID>.md`
2. Accepted ADRs in `docs/decisions/`
3. [`SPEC.md`](../SPEC.md)
4. Project docs under `docs/`
5. `AGENTS.md`
6. Existing implementation conventions
7. Harness/session instructions

## Task lifecycle

```text
ready → implementing → candidate → reviewer + tester
  → changes_requested → implementing → candidate → approved → merged → done
```

Any state may become `blocked`.

## Before dispatching work

1. Read `state/CURRENT.md` and `tasks/index.md` (or the specific `tasks/<TASK-ID>.md`).
2. Confirm **dependencies** for the task are complete.
3. Check **allowed file surfaces** do not overlap another active task (especially `packages/contracts`, root workspace, same app package).
4. Confirm SPEC §11 blockers are not being implemented without approval.
5. Build or use `state/task-context/<TASK-ID>.md` (see `token-efficient-coding` skill).
6. Assign branch/worktree: `agent/<TASK-ID>-<short-slug>` or lane branch per task.

## Parallelism (safe only when)

- All declared dependencies are complete.
- Allowed file surfaces do **not** materially overlap.
- Tasks do not depend on an unstable shared contract.
- Integration is owned by a later task or integration owner.
- Tasks respect SPEC exclusive directories across developers.

If two tasks would heavily edit the same module, **sequence** them or split ownership.

## Integration gates (conceptual DAG)

Gate nodes from SPEC §8; detailed exit criteria in [`roadmap.md`](roadmap.md).

```text
Gate 0 (scaffold + contract freeze)
  ├─→ Gate 1 parallel: mobile vertical | API vertical | planner vertical
  ├─→ Gate 2 planner integration (API + packages/planner)
  ├─→ Gate 3 mobile integration
  ├─→ Gate 4 product rules (voting, fairness, scheduling)
  └─→ Gate 5 demo/release
```

Tasks should declare which gate they advance.

## Roles

| Role | Definition |
|------|------------|
| Orchestrator | [`agents/orchestrator.md`](../agents/orchestrator.md) — task graph, worktrees, gates, `state/CURRENT.md` |
| Implementer | [`agents/implementer.md`](../agents/implementer.md) — smallest change that meets acceptance criteria |
| Reviewer | [`agents/reviewer.md`](../agents/reviewer.md) — P0–P3 findings, privacy/contracts/architecture |
| Tester | [`agents/tester.md`](../agents/tester.md) — adversarial tests, PASS/FAIL gate |

Task file states which role runs first and whether review/test are required.

## Completion gate

A task is done only when:

- Acceptance criteria met
- Relevant tests pass
- Reviewer has no open P0/P1
- Tester has no unexplained failures
- No known privacy leak or unapproved contract drift
- Handoff written; `state/CURRENT.md` updated if project state changed

## Worktree policy

- Orchestrator owns worktree lifecycle.
- One worktree per independent PR-sized task when used.
- Workers do not create arbitrary sibling worktrees unless the task permits it.
- Do not merge until review/test gates pass.
- Workers do not push directly to `main`; no force-push or rewrite of shared history.
- Long-lived lanes: `feature/mobile`, `feature/core-api`, `feature/planner` from shared Gate 0 base.

## Persistent handoff locations

| Outcome | Where |
|---------|--------|
| Code | Task branch / lane branch |
| Tests | App/package test dirs (see repo-map after GATE0-001) |
| ADR | `docs/decisions/` |
| Task status | `tasks/*.md`, `tasks/index.md` |
| Project state | `state/CURRENT.md` |
| Active dispatch | `state/agents/<TASK-ID>.md` |
| Context pack | `state/task-context/<TASK-ID>.md` |

## Task index (where to look)

- **Human index:** `tasks/index.md`
- **Conceptual graph:** `docs/roadmap.md`
- **Template:** `tasks/TASK_TEMPLATE.md`
- **Repo map:** `state/repo-map.md`
- **Developer lanes:** `docs/developers/`

Refresh this document when orchestration policy changes in `docs/project_execution_contract.md` or `agents/orchestrator.md`.
