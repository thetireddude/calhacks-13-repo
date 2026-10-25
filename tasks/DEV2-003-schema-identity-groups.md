# DEV2-003 — Schema: identity and groups

## Status

ready

## Dependencies

- DEV2-002

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Worktree required: yes  
Developer lane: core-api

## Goal

Supabase migrations for user profiles, groups, memberships, and invitations (logical resources SPEC §4).

## Read first

- `SPEC.md` §4 persistence list
- `docs/milestone-dag.md` W4

## Allowed files

- `supabase/migrations/**`
- `supabase/README.md` (docs only)

## Do not modify

- `apps/mobile/**`, `packages/planner/**`
- Full route implementations (DEV2-005)

## Acceptance criteria

- Migrations apply cleanly on fresh local Supabase.
- RLS policies stub or documented TODO where rules pending SPEC §11.
- README lists tables and ownership.

## Required tests

- Migration smoke or SQL policy tests if feasible; else documented apply command in handoff.
