# Developer 3 — Planner, agents, discovery

**Branch:** `feature/planner`  
**Owns:** `packages/planner/**`

## Your job

Provider abstraction (Creao assessment + adapter), personal-agent evaluations, Bright Data ingestion + normalization, seeded fallback, **approved** deterministic scoring weights, inclusion fairness (formulas pending approval), privacy-safe explanations.

## Must read

1. [`AGENTS.md`](../../AGENTS.md)
2. [`SPEC.md`](../../SPEC.md) §5, §6.3, §7, §10
3. [`state/CURRENT.md`](../../state/CURRENT.md)
4. Task: [`tasks/DEV3-001-planner-readiness.md`](../../tasks/DEV3-001-planner-readiness.md)

## Must not edit

- `supabase/**`, `apps/api/**`, `apps/mobile/**`
- Persisting votes, confirmations, or membership

## Public surface

Implement `PlannerPort.generatePlans(input) → PlannerResult` types from `packages/contracts`. Backend owns persistence.

## Testing stance

Frozen planner input fixtures; reproducible scoring from deterministic inputs; provider failure → safe errors; no private history in public output.

## First tasks

`DEV3-001`, then package entry + seeded discovery before live Bright Data/Creao.
