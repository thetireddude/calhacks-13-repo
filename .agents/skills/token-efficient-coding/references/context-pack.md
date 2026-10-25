# Context Pack

Compact handoff from Orchestrator to Implementer, Reviewer, and Tester. Location (convention):

```text
state/task-context/<TASK-ID>.md
```

## Schema

```yaml
task: TASK-ID

objective:
  Short description of the intended change.

read_first:
  - exact/file/path.py
  - tests/exact_test.py

references:
  - docs/decisions/relevant-adr.md

invariants:
  - important requirement
  - privacy, auth, or contract constraint

expected_tests:
  - tests/exact_test.py

likely_symbols:
  - FunctionName
  - ClassName

avoid:
  - unrelated subsystem
  - generated directory

known_state:
  branch: optional
  base_commit: optional

worktree:
  path: optional
  branch: optional
  base_commit: optional

discovery_guidance:
  start_targeted: true

discovery_budget:          # optional soft signals, not hard limits
  targeted_searches: 2
  additional_file_reads: 5
```

Use YAML frontmatter or equivalent structured blocks in Markdown. Keep prose minimal.

If exploration exceeds soft budgets, perform it and **record why** in the pack.

## Orchestrator duties

1. Read current task and `state/repo-map.md`
2. Identify likely affected files, ADRs, invariants, tests
3. Build context pack
4. Delegate with objective + read_first + invariants — not "explore and figure it out"
5. Update `state/repo-map.md` or optional indexes when structure changes

## Downstream consumption

**Implementer**: context pack → task → listed files → targeted search → minimal change → targeted tests.

**Reviewer**: context pack → task → `git diff --stat` → per-file diffs → invariants → broaden for privacy/security as needed.

**Tester**: context pack → changed behavior → associated tests first → expand by risk.

Each role appends **material discoveries** only (new callers, missed invariant, extra test file). No long prose after every command.

## What to persist in the pack

- New affected files discovered during implementation
- Caller sites for interface changes
- Privacy or contract risks identified
- Tests that must run before merge
- Worktree/branch/commit if relevant

## What not to persist

- Verbose reasoning
- Full tool output
- Full diffs or source copies
- One-off debug messages

## Example dispatch (good)

```text
Implement GATE0-002.

Objective: Stub PlannerPort and core DTOs in packages/contracts.

Read first:
- packages/contracts/
- tasks/GATE0-002-contract-stubs.md
- SPEC.md §6

Invariants:
- no unapproved SPEC §11 voting/planning enums
- PlannerPort does not imply persistence

Expected tests:
- packages/contracts contract/type tests once added

Use targeted discovery only if this context is insufficient.
```

## Example dispatch (bad)

```text
Implement FEAT-002. Explore the repository and figure it out.
```

## Repository indexes

| File | Purpose |
|------|---------|
| `state/repo-map.md` | Where modules, tests, docs live |
| `state/CURRENT.md` | Project milestone and completed tasks |
| `state/agents/<TASK-ID>.md` | Active task observability (this repo) |
| `state/architecture-index.md` | Optional ADR/doc index |
| `state/dependency-notes.md` | Optional cross-module boundaries |

Do not duplicate full agent policies in these files.
