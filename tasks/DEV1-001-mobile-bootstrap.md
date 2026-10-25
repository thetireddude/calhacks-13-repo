# DEV1-001 — Expo bootstrap

## Status

candidate

## Dependencies

- GATE0-001

## Execution

Primary role: implementer  
Review required: yes  
Tester required: no  
Worktree required: yes  
Developer lane: mobile  
Gate: Gate 1

## Goal

Replace the `apps/mobile` placeholder with a runnable Expo (React Native, TypeScript) app that imports `@gather/contracts` types.

## Read first

- `AGENTS.md`
- `docs/project-dag.md`
- `state/CURRENT.md`
- `docs/developers/developer-1-mobile.md`
- `SPEC.md` — SPEC §2 (Mobile), §3, §7.3
- `state/task-context/DEV1-001.md`
- `packages/contracts/src/**` (consume only)

## Allowed files

- `apps/mobile/**`

## May modify if necessary

- pnpm-lock.yaml (only if adding `@gather/contracts` workspace dep)

## Do not modify

- `apps/api/**`, `supabase/**`, `packages/planner/**`
- `packages/contracts/**` (consume only; request changes via SPEC §9)
- Root workspace config (integration owner), except lockfile when adding a workspace dep and the task allows it

## Requirements

- Expo + TypeScript app shell with a single placeholder home screen.
- `@gather/contracts` declared as a workspace dependency; one type import compiles.
- `typecheck`, `lint`, `build`/`test` scripts in `apps/mobile/package.json` become real (no `process.exit(0)` stubs).
- `apps/mobile/README.md` documents start/typecheck/test commands and Expo Go / physical-device run steps.

## Critical correctness constraints

- Never display or mock other members' private availability or raw preference history.
- No client-side voting, fairness, or planner scoring rules; do not guess SPEC §11 items.
- Mobile imports DTOs from `@gather/contracts` only, never `apps/api` internals.
- Do not add dependencies beyond Expo basics + test runner.
- No secrets committed; env via `.env.example` entries only if needed (flag to integration owner).

## Acceptance criteria

- App starts via `pnpm --filter @gather/mobile start`.
- `pnpm --filter @gather/contracts build && pnpm --filter @gather/mobile typecheck` passes.
- One smoke test (renders home screen) passes.

## Required tests

- Smoke render test; contract type-import compile check.

## Handoff

Commit `DEV1-001:` on `agent/DEV1-001-mobile-bootstrap`, set status `candidate`, no merge. Report files changed, commands run (`pnpm --filter @gather/contracts build`, `pnpm --filter @gather/mobile typecheck`, `pnpm --filter @gather/mobile test`), results, limitations, what is not wired yet, and any SPEC §9 contract change requests.
