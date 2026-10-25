# DEV2-013 — Local Dev 2 DX (env + runbooks)

## Status

implementing

## Dependencies

- DEV2-010

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Worktree required: yes  
Developer lane: core-api

## Goal

Document exact local setup for Developer 2: Supabase CLI, migrations, API env, `test:ci`. No runtime behavior change unless `.env.example` only.

## Allowed files

- `.env.example`
- `apps/api/README.md`, `supabase/README.md`
- `docs/dev2-local-setup.md` (new)

## Do not modify

- `apps/api/src/**` (docs-only task)
- `apps/mobile/**`, `packages/planner/**`

## Acceptance criteria

- All variables for Gate 2 local dev listed with where to obtain values (`supabase status`).
- Steps: install deps → `supabase start` → `supabase db reset` → set env → `pnpm run test:ci`.
- Tester runs `pnpm run test:ci` (unchanged pass count).

## Handoff

Commit `DEV2-013:`, status `candidate`, no merge.
