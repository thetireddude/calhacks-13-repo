# DEV2-010 — Gate 1 exit (Developer 2 lane)

## Status

done

## Dependencies

- DEV2-009

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Worktree required: yes  
Developer lane: core-api

## Goal

Close **SPEC §8 Gate 1** for Developer 2: document shipped API/schema, verify checklist, ensure CI runs `pnpm run test:dev2` (27 tests). No new product features.

## Allowed files

- `apps/api/README.md`
- `supabase/README.md`
- `.github/workflows/ci.yml`
- `.env.example`
- `docs/gate1-dev2-exit.md` (new)
- `state/GATE1-DEV2-EXIT.md` (new checklist + evidence)
- `tasks/index.md`, `state/CURRENT.md` (status only)

## Do not modify

- `apps/mobile/**`, `packages/planner/**`
- `apps/api/src/**` unless a one-line fix required for CI (avoid)

## Acceptance criteria

- Checklist maps SPEC Gate 1 Dev 2 bullets to repo evidence.
- `supabase/README.md` documents all four migrations and private vs group-visible tables.
- `apps/api/README.md` lists implemented Gate 1 routes + `pnpm run test:dev2`.
- CI executes `pnpm run test:dev2` on push/PR.
- `pnpm run test:dev2` passes.

## Handoff

Commit `DEV2-010:`, task status `candidate`, no merge.
