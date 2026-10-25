# DEV1-002 — Navigation and auth shell

## Status

ready

## Dependencies

- DEV1-001

## Execution

Primary role: implementer  
Review required: yes  
Tester required: no  
Worktree required: yes  
Developer lane: mobile

## Goal

Add Expo Router or React Navigation shell with placeholder screens for auth, groups, and home (no real Supabase yet).

## Read first

- `docs/milestone-dag.md` W3
- `apps/mobile/App.tsx`
- `docs/developers/developer-1-mobile.md`

## Allowed files

- `apps/mobile/**`

## Do not modify

- `apps/api/**`, `supabase/**`, `packages/**`

## Acceptance criteria

- Navigation between placeholder screens works in simulator.
- README updated with screen map vs SPEC §1 journey.
- `pnpm --filter @gather/mobile typecheck` passes.

## Required tests

- Manual/simulator smoke documented in handoff.
