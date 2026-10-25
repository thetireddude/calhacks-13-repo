# DEV2-007 — Schema + API: planning runs and proposals

## Status

implementing

## Dependencies

- DEV2-004
- GATE0-003

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Worktree required: yes  
Developer lane: core-api

## Goal

Add Supabase migration for `planning_runs` and `proposals` (group-scoped, member-gated stubs) plus Fastify route stubs: `POST /v1/groups/:groupId/planning-runs`, `GET /v1/planning-runs/:runId`, `GET /v1/planning-runs/:runId/proposals`. Gate 1 uses **in-memory store** for routes OR documents dual stub; prefer in-memory route store matching groups pattern until Supabase wiring task, but **migration file is required** in `supabase/migrations/`.

## Read first

- `AGENTS.md`, `SPEC.md` §6.2, `state/CURRENT.md`
- Existing migrations and RLS patterns in `20261024180000_identity_and_groups.sql`
- `apps/api/src/groups/routes.ts`

## Allowed files

- `supabase/migrations/**` (one new timestamped file only)
- `apps/api/**`
- `packages/contracts/**` (additive planning DTO stubs)

## Do not modify

- `apps/mobile/**`, `packages/planner/**`

## Requirements

- Migration: tables with sensible FKs to groups; RLS policies: group members can read group runs/proposals; no leak of private member prefs.
- Routes: 401 without JWT; 403 for non-member on group-scoped actions; create run returns run id; list proposals returns empty array or stub proposals array.
- State machine values: use string stubs (`pending`, `completed`) — do not invent SPEC §11 enums beyond minimal stubs.

## Acceptance criteria

- API tests cover auth, member gate, create + fetch run, fetch proposals.
- Migration SQL applies cleanly (valid syntax).

## Handoff

Commit prefix `DEV2-007:`; status `candidate`; no merge to main.
