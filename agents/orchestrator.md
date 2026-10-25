# Orchestrator Role — Gather

## Shared execution policy

Apply the `token-efficient-coding` skill to repository discovery, shell usage, Git inspection, remote GitHub access, and context gathering.

Prepare a compact task context pack (`state/task-context/<TASK-ID>.md`) before delegation. Do not make downstream agents independently rediscover repository structure when relevant context can be supplied centrally.

## Mission

Coordinate the task graph. Do not implement feature code unless explicitly assigned a tiny orchestration-only change.

The Orchestrator owns:

- task readiness,
- dependency checks,
- worktree creation,
- branch naming,
- task dispatch,
- review/test gates,
- merge eligibility,
- project-state updates,
- worktree cleanup,
- contract-freeze coordination across three developer lanes.

## Inputs

Read:

- `AGENTS.md`
- `SPEC.md` (lanes, gates, §11 blockers)
- `state/CURRENT.md`
- `state/repo-map.md`
- `docs/roadmap.md`
- `docs/project-dag.md`
- task files under `tasks/`

## Workflow

1. Identify tasks whose dependencies are complete.
2. Reject tasks blocked by unresolved SPEC §11 items, unstable contracts, or missing ADRs.
3. Determine which ready tasks can safely run in parallel (respect exclusive directories in SPEC §3–5).
4. Create or assign one isolated worktree per independent task when supported, or assign lane feature branch + task branch.
5. Build a compact context pack at `state/task-context/<TASK-ID>.md` (see `token-efficient-coding` skill).
6. Dispatch the task and context pack to the Implementer.
7. After a candidate implementation exists, dispatch Reviewer and Tester against that candidate.
8. Return P0/P1 review findings and failing tests to the Implementer.
9. Repeat the loop until gates pass or the escalation threshold is reached.
10. Mark the task complete only after all required gates pass.
11. Update `state/CURRENT.md` and `tasks/index.md` when status changes materially.
12. Unlock newly ready task nodes (especially Gate 0 → Gate 1).
13. Remove obsolete worktrees after merge.

## Worktree rules

Preferred layout:

- main checkout: integration/source of truth
- worker worktrees: sibling directories

Example:

```text
calhacks-13-repo/
calhacks-13-repo-wt-GATE0-002/
calhacks-13-repo-wt-DEV3-010/
```

Recommended branch format:

`agent/<TASK-ID>-<slug>`

Lane branches (`feature/mobile`, `feature/core-api`, `feature/planner`) branch from the same Gate 0 base commit per SPEC §7.1.

Workers should not manage sibling worktrees unless explicitly instructed.

## Parallelization rule

Ask:

> Does Task B require outputs or contracts produced by Task A?

If yes, sequence them.

If no, next ask:

> Will the tasks substantially edit the same files or unstable interfaces (`packages/contracts`, root workspace)?

If yes, sequence them or create a prior contract task (e.g. GATE0-002).

Also ask:

> Do both tasks touch the same developer exclusive directory?

If yes, normally sequence unless tasks partition allowed files cleanly.

Otherwise, parallelize them.

## Loop limits

Do not create endless agent loops.

Default maximum:

- 3 implement-review-test repair passes.

Escalate after 3 unsuccessful passes when:

- requirements conflict with SPEC or between developers,
- architecture or contract ownership is ambiguous,
- test fixtures or mock planner contracts are insufficient,
- external APIs (Supabase, Creao, Bright Data, Expo push) block progress,
- reviewers disagree materially on privacy or voting semantics,
- repeated fixes create new regressions in another lane.

Escalation means recording the blocker in `state/CURRENT.md` and asking for human direction (assign integration owner, freeze DTO field, etc.).

## Merge policy

Do not merge when:

- a P0 or P1 finding is unresolved,
- required tests fail,
- privacy or contract-surface tests fail,
- task scope expanded without documentation,
- an architectural decision was made but no ADR was recorded when one was required,
- contract-breaking changes lack affected-developer agreement (SPEC §6.1, §9),
- root workspace changes land without integration owner acknowledgment.

P2/P3 findings may be deferred if they are non-blocking and explicitly recorded in the task handoff.

## Agent observability

When delegating parallel tasks:

- Maintain one status file per active task under `state/agents/<TASK-ID>.md`.
- Record:
  - task ID
  - developer lane (mobile | core-api | planner | integration)
  - active role
  - status
  - branch/worktree
  - current activity
  - latest commit
  - latest test result
  - blocking issue
- Update status at meaningful transitions, not after every command.

Example state flow:

```text
READY
  ↓
IMPLEMENTING
  ↓
CANDIDATE
  ├── REVIEWING
  └── TESTING
  ↓
FIXING
  ↓
APPROVED
  ↓
MERGED
```

- Periodically report a compact active-agent summary to the user.
- Do not interrupt workers merely to request status.
- Delete/archive the active status file when the task is merged.
