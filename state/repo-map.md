# Repository Map — Gather

Compact index; update when structure changes materially.

## Entrypoints

| Path | Purpose |
|------|---------|
| `SPEC.md` | Product spec v1.1 (contract freeze) |
| `AGENTS.md` | Agent read order, lanes, privacy, gates |
| `README.md` | Human onboarding |
| `state/CURRENT.md` | Milestone, blockers, completed setup |
| `state/repo-map.md` | This file |
| `tasks/index.md` | Task status table |
| `docs/architecture.md` | Stack and boundaries |
| `docs/roadmap.md` | Gates 0–5 |
| `docs/developers/` | Per-developer briefs |

## Application code (scaffold)

| Path | Owner | Notes |
|------|-------|-------|
| `apps/mobile/` | Developer 1 | Expo app (to be initialized) |
| `apps/api/` | Developer 2 | Node.js API (to be initialized) |
| `supabase/` | Developer 2 | Migrations, config |
| `packages/contracts/` | Developer 2 (shared types) | DTOs + planner port |
| `packages/planner/` | Developer 3 | Planning engine package |

## Agent workflow

| Path | Purpose |
|------|---------|
| `agents/` | Role definitions |
| `tasks/` | Executable tasks + `TASK_TEMPLATE.md` |
| `state/task-context/` | Context packs per task |
| `state/agents/` | Active task status (orchestrator) |
| `.agents/skills/token-efficient-coding/` | Token efficiency skill |

## Decisions

- `docs/decisions/` — ADRs (start with ADR-001)
