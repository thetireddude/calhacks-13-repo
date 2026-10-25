# DEV2-005 — API: groups, invites, members

## Status

candidate

## Dependencies

- DEV2-003

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Developer lane: core-api

## Goal

Implement SPEC §6.2 routes: POST/GET groups, invites, join, members; enhance GET /v1/me with profile stub.

## Allowed files

- `apps/api/**`
- `packages/contracts/**` (additive DTOs only, version bump)

## Do not modify

- `apps/mobile/**`, `packages/planner/**`

## Acceptance criteria

- Routes return 401 without JWT; 403 for non-members where applicable.
- Integration tests with mock DB or supabase local optional; unit tests minimum.
