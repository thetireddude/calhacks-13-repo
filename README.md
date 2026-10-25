# Gather

Cal Hacks 13.0 — Meta Track. Turn friend-group hangout intentions into confirmed plans.

## Team setup

| Developer | Focus | Branch | Docs |
|-----------|--------|--------|------|
| 1 | Mobile (Expo) | `feature/mobile` | [Developer 1 brief](docs/developers/developer-1-mobile.md) |
| 2 | API + Supabase + contracts | `feature/core-api` | [Developer 2 brief](docs/developers/developer-2-backend.md) |
| 3 | Planner + AI + discovery | `feature/planner` | [Developer 3 brief](docs/developers/developer-3-planner.md) |

**Product spec:** [`SPEC.md`](SPEC.md) (v1.1 contract freeze)

**Agents / AI assistants:** [`AGENTS.md`](AGENTS.md) → [`docs/project-dag.md`](docs/project-dag.md) → [`state/CURRENT.md`](state/CURRENT.md) → your task in [`tasks/`](tasks/).

## Repository layout

```text
apps/mobile/           # Developer 1
apps/api/              # Developer 2
supabase/              # Developer 2
packages/contracts/    # Shared DTOs + PlannerPort (Dev 2 maintains)
packages/planner/      # Developer 3
docs/                  # Architecture, roadmap, ADRs
tasks/                 # Executable work units
state/                 # CURRENT.md, repo map, task context
```

## Current milestone

**Gate 0** — monorepo tooling + contract stubs. See [`state/CURRENT.md`](state/CURRENT.md) and [`tasks/index.md`](tasks/index.md).

Next human decision: assign **integration owner** and complete **GATE0-001** (package manager + workspace).

## Local development

Requires **Node 20+** and **pnpm 9** (`corepack enable`).

```bash
pnpm install
pnpm typecheck
pnpm test
```

Package-specific work: `pnpm --filter @gather/api run build`, etc.

Copy environment template when present:

```bash
cp .env.example .env
# Fill Supabase URL/anon key and provider keys locally — never commit .env
```

## Git workflow

- Three long-lived feature branches from the same Gate 0 base commit.
- PRs list owned paths, contract changes, and tests (SPEC §7.4).
- Do not merge contract-breaking changes without affected-developer approval.
