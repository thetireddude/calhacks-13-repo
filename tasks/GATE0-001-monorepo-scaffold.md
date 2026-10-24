# GATE0-001 — Monorepo and root tooling scaffold

## Status

ready

## Dependencies

- META-001

## Execution

Primary role: implementer  
Review required: yes  
Tester required: no  
Worktree required: no  
Developer lane: integration

## Goal

Choose and commit root workspace tooling so all three feature branches can build from the same base (SPEC Gate 0).

## Read first

- `SPEC.md` §7.2, §11 (build/integration open items)
- `state/CURRENT.md`
- `docs/roadmap.md`

## Allowed files

- Root manifest files (package manager TBD: e.g. `package.json`, `pnpm-workspace.yaml`, or equivalent)
- Root TypeScript config if applicable
- `.gitignore`, `.env.example`
- `README.md` (setup section only)
- Minimal CI stub (e.g. `.github/workflows/`)

## Do not modify

- `apps/mobile/**`, `apps/api/**`, `packages/planner/**` application code beyond placeholders
- `SPEC.md`

## Requirements

- Document chosen package manager and Node version in README.
- Define workspaces: `apps/*`, `packages/*`.
- Assign integration owner in `state/CURRENT.md` when decided.
- Provide `.env.example` with Supabase and provider placeholders (no secrets).

## Acceptance criteria

- `pnpm install` / `npm install` / equivalent succeeds from clean clone.
- Empty or stub packages under `apps/` and `packages/` are wired into workspace.
- CI runs lint/typecheck stub or no-op with clear TODO for Gate 1.

## Required tests

Documentation and install smoke only.
