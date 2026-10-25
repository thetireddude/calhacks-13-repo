# Project Execution Contract — Gather

This document defines how any coding harness can work on this repository without access to another vendor's chat history.

## Principle

The repository is the durable shared memory.

No critical project knowledge may exist only inside:

- Codex conversation history,
- Claude conversation history,
- Cursor chat history,
- local scratch notes,
- undocumented agent reasoning.

## Universal context files

All harnesses should understand these paths:

- `SPEC.md` — frozen product requirements, developer lanes, integration gates, open decisions (§11).
- `AGENTS.md` — global agent rules, privacy, planner boundary, git/worktree policy.
- `agents/` — role definitions (Orchestrator, Implementer, Reviewer, Tester).
- `docs/` — architecture, roadmap, developer briefs, execution contract, project DAG.
- `docs/decisions/` — accepted architecture decisions (ADRs).
- `tasks/` — executable PR-sized work (`tasks/index.md`, `tasks/TASK_TEMPLATE.md`).
- `state/CURRENT.md` — current milestone, blockers, completion log.
- `state/repo-map.md` — compact repository index.
- `state/task-context/` — orchestrator context packs per task.
- `state/agents/` — active task observability files.
- `state/CHANGELOG.md` — concise completed-task history.

Vendor-specific config may point to these files, but must not contain unique project truth.

## Vendor-specific adapters

Optional folders such as:

```text
.codex/
.claude/
.cursor/
.agents/
```

may contain invocation/configuration details and harness skills.

They must not be the only location for:

- architecture decisions,
- product or voting methodology,
- task status,
- API/planner contracts,
- privacy rules,
- testing rules,
- developer lane ownership.

## Standard task lifecycle

```text
ready
  ↓
implementing
  ↓
candidate
  ├─→ reviewer
  └─→ tester
        ↓
changes_requested
        ↓
implementing
        ↓
candidate
        ↓
approved
        ↓
merged
        ↓
done
```

A task may enter `blocked` from any state.

See also: [`docs/project-dag.md`](project-dag.md).

## Required task metadata

Every PR-sized task should define:

- task ID,
- status,
- dependencies,
- developer lane (`mobile` | `core-api` | `planner` | `integration`),
- primary role,
- review requirement,
- testing requirement,
- worktree requirement (when applicable),
- goal,
- read-first context (including SPEC sections),
- allowed file surface,
- may-modify / do-not-modify paths,
- inputs,
- outputs,
- acceptance criteria,
- required tests,
- handoff requirements.

## Context handoff

When a harness finishes work, durable outcomes belong in the repo:

- implementation → code in owned paths,
- tests → package/app test directories or `tests/` as established in GATE0-001,
- architecture decisions → `docs/decisions/`,
- contract changes → `packages/contracts` with consumer acknowledgment,
- task completion → task file status + `tasks/index.md`,
- new known limitation or SPEC blocker → `state/CURRENT.md` or task handoff,
- methodology or gate changes → `docs/roadmap.md` / ADR.

Do not preserve raw chain-of-thought. Preserve decisions, evidence, commands, results, and rationale needed by the next engineer or agent.

## Worktree ownership

The orchestration layer owns worktree lifecycle.

Worker roles operate inside an assigned checkout/worktree or assigned feature branch.

This keeps the project portable because Git, branches, commits, tests, and Markdown are the shared protocol—not a vendor-specific multi-agent feature.

## Three-developer merge protocol

Summarized from SPEC §9:

1. Interface change proposed with reason.
2. Affected developers review.
3. Developer 2 updates `packages/contracts` after agreement.
4. Consumers update implementations.
5. Contract tests pass.
6. Integration owner merges when gates pass.

No cross-lane file edits to "fix integration" without agreement.
