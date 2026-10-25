# DEV2-002 — Supabase local config and JWT middleware

## Status

done

## Dependencies

- DEV2-001

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Worktree required: yes  
Developer lane: core-api

## Goal

Local Supabase project config and API middleware that validates Supabase JWT shape on protected routes (full OTP flow in later tasks).

## Read first

- `SPEC.md` §4 (auth)
- `docs/milestone-dag.md` W3
- `apps/api/src/app.ts`

## Allowed files

- `supabase/**`
- `apps/api/**` (middleware, config)

## Do not modify

- `packages/planner/**`
- `apps/mobile/**`

## Acceptance criteria

- Supabase CLI config documented in `supabase/README.md`
- Middleware rejects missing/invalid Authorization on a sample protected route stub
- Tests with mock JWT or test secret
- `pnpm --filter @gather/api` typecheck + test pass

## Required tests

- Middleware unit/integration tests
