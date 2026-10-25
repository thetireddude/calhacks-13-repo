---
name: gather-agent-workflow
description: Gather (Cal Hacks 13) agent workflow — read AGENTS.md, SPEC.md, state/CURRENT.md, tasks, project DAG, and developer briefs before code changes.
---

# Gather Agent Workflow

Apply when working in this repository on non-trivial code, tests, docs, or multi-agent orchestration.

## Read order

1. [`AGENTS.md`](../../AGENTS.md)
2. [`SPEC.md`](../../SPEC.md) (sections referenced by your task)
3. [`state/CURRENT.md`](../../state/CURRENT.md)
4. Assigned [`tasks/<TASK-ID>.md`](../../tasks/)
5. [`docs/project-dag.md`](../../docs/project-dag.md)
6. Your [`docs/developers/`](../../docs/developers/) brief when touching a lane surface

## Token efficiency

Use [`.agents/skills/token-efficient-coding/SKILL.md`](../../.agents/skills/token-efficient-coding/SKILL.md).

## Roles

- Orchestrator → [`agents/orchestrator.md`](../../agents/orchestrator.md)
- Implementer → [`agents/implementer.md`](../../agents/implementer.md)
- Reviewer → [`agents/reviewer.md`](../../agents/reviewer.md)
- Tester → [`agents/tester.md`](../../agents/tester.md)

## Lanes

Respect exclusive directories in SPEC §3–5. Root workspace changes require integration owner (see `state/CURRENT.md`).

## Completion

Tasks finish only after acceptance criteria, tests, review/test gates, handoff, and state updates per `AGENTS.md`.
