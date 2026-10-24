# Project Execution Contract — Gather

How any coding harness works on this repository without vendor-specific chat history.

## Principle

The repository is durable shared memory. Critical knowledge must not live only in Cursor/Codex/Claude threads or private notes.

## Universal context files

| Path | Purpose |
|------|---------|
| `SPEC.md` | Frozen product, lanes, gates, unresolved decisions |
| `AGENTS.md` | Agent rules, read order, privacy, lanes |
| `agents/` | Orchestrator, Implementer, Reviewer, Tester |
| `docs/` | Architecture, roadmap, developer briefs |
| `docs/decisions/` | Accepted ADRs |
| `tasks/` | PR-sized executable work |
| `state/CURRENT.md` | Milestone, blockers, completion log |
| `state/repo-map.md` | Where code and docs live |
| `state/task-context/` | Per-task context packs |
| `state/agents/` | Active task observability |

Optional `.cursor/`, `.codex/`, `.claude/` may hold harness config; they must not be the only copy of decisions or task status.

## Task lifecycle

```text
ready → implementing → candidate → reviewer + tester
  → changes_requested → implementing → candidate → approved → merged → done
```

Any state may become `blocked`.

## Worktree ownership

Orchestrator owns worktrees and merge eligibility. Workers use assigned branches (`feature/*` or `agent/<TASK-ID>-<slug>`).

## Handoff durability

Outcomes belong in the repo: code, tests, ADRs, updated task files, `state/CURRENT.md`, concise rationale—not raw chain-of-thought.
