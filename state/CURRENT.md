# Current Project State — Gather

## Milestone

**Gate 0** — Architecture and contract freeze (SPEC §8).

## Completed

- SPEC v1.1 committed as product contract (`SPEC.md`).
- Vendor-neutral agent workflow installed (`META-001`):
  - `AGENTS.md`, `agents/*`, `docs/project_execution_contract.md`
  - `tasks/` index and initial Gate 0 / developer readiness tasks
  - `state/repo-map.md`, `state/task-context/README.md`
  - `.agents/skills/token-efficient-coding/`
- ADR-001: SPEC as authoritative product source.
- Monorepo directory scaffold (apps, packages, supabase placeholders).

## Active / next work

| Priority | Task | Owner lane | Notes |
|----------|------|------------|-------|
| 1 | GATE0-001 | Integration (unassigned) | Choose package manager, root workspace, CI stub |
| 2 | GATE0-002 | Developer 2 | Contract type stubs (`PlannerPort`, core DTOs) |
| 3 | DEV1-001 | Developer 1 | Mobile app bootstrap on `feature/mobile` |
| 4 | DEV2-001 | Developer 2 | API bootstrap on `feature/core-api` |
| 5 | DEV3-001 | Developer 3 | Planner package bootstrap on `feature/planner` |

## Blockers (from SPEC §11 — do not guess)

- **Integration owner** unassigned for root manifest, lockfile, CI.
- **Package manager** and workspace tooling not chosen.
- **API and planner DTO schemas** not yet frozen (stubs only until GATE0-002 + review).
- LLM provider, scoring formulas, voting thresholds, scheduler technology — open.

## Branches

Create from the same base commit after Gate 0 scaffold merges to `main`:

- `feature/mobile`
- `feature/core-api`
- `feature/planner`

## For agents

Read `tasks/index.md` for status. Pick tasks matching your lane and dependencies.
