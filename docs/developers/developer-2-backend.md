# Developer 2 — Core API and Supabase

**Branch:** `feature/core-api`  
**Owns:** `apps/api/**`, `supabase/**`, `packages/contracts/**`

## Your job

Supabase schema, session validation, REST API per SPEC §6.2, planning orchestration (mock then real planner), weekly scheduling, voting/confirmation, notifications, ICS delivery, privacy enforcement on reads/writes.

## Must read

1. [`AGENTS.md`](../../AGENTS.md)
2. [`SPEC.md`](../../SPEC.md) §4, §6, §7, §10
3. [`state/CURRENT.md`](../../state/CURRENT.md)
4. Standing orders (auto-drive): [`dev2-standing-orders.md`](dev2-standing-orders.md)
5. Assigned `tasks/<TASK-ID>.md`

## Must not edit

- `apps/mobile/**`
- Planner scoring, prompts, provider adapters inside `packages/planner/**` (consume public port only)

## Contracts

You maintain `packages/contracts/**` but **cannot unilaterally** change planner public interface or mobile DTOs—get consumer sign-off (SPEC §6.1).

## Testing stance

Mock `PlannerPort` for all core API tests. No live Creao or Bright Data required for CI.

## First tasks

`GATE0-002` (contract stubs), `DEV2-001`, then schema + auth skeleton per roadmap.
