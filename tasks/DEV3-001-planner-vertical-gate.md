# DEV3-001 — Planner vertical review and Gate 1 evidence

## Status

candidate

## Dependencies

- GATE0-003
- `docs/decisions/ADR-002-planner-rules.md`

## Execution

Primary role: reviewer

Review required: yes

Tester required: yes

Worktree required: yes

Developer lane: planner

## Goal

Bring the existing `feature/planner` implementation under the task workflow and establish whether it is a safe, importable Gate 1 planner vertical.

## Read first

- `AGENTS.md`
- `docs/project-dag.md`
- `SPEC.md` §2, §5, §6.3, §7, §10
- `docs/decisions/ADR-002-planner-rules.md`
- `docs/developers/developer-3-planner.md`
- `state/task-context/DEV3-001.md`
- `packages/planner/README.md`

## Allowed files

- `packages/planner/**`
- `state/agents/DEV3-001.md`
- `tasks/DEV3-001-planner-vertical-gate.md`

## Do not modify

- `apps/api/**`, `apps/mobile/**`, `supabase/**`
- `packages/contracts/**` (contract ownership and consumer review belong to DEV3-002)

## Requirements

- Review the existing seeded discovery, live-discovery normalization, fallback, privacy preparation, validation, scoring, tie-resolution, and provider adapters against ADR-002.
- Verify the package imports through its public entry point and does not persist data, votes, or confirmed events.
- Verify unknown/malformed provider and discovery responses fail safely and use seeded fallback only where ADR-002 permits it.
- Verify public output cannot contain private histories, names, email, raw availability, or opted-out learning history.

## Acceptance criteria

- Reviewer has no open P0/P1 findings, or findings are repaired and re-reviewed.
- Planner package build, typecheck, and tests pass from a clean worktree.
- A concise Gate 1 handoff names any remaining dependency on DEV3-002+ or external credentials.

## Required tests

- `pnpm --filter @gather/planner build`
- `pnpm --filter @gather/planner typecheck`
- `pnpm --filter @gather/planner test`
- Focused privacy, malformed-output, discovery-failure, deterministic-score, and tie tests.

## Handoff

Report commit, files reviewed/changed, exact commands and counts, privacy findings, and whether DEV3-002 may start.
