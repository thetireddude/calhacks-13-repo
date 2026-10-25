# Gather Planner (`packages/planner`)

**Owner:** Developer 3  
**Branch:** `feature/planner`

Importable planning engine: personal-agent evaluations, discovery, deterministic scoring, explanations. See SPEC §5 and §6.3.

## Status

The package currently provides contract-independent planner internals: seeded
candidate discovery, provider-safe input preparation, fallback discovery, and
ranking over caller-supplied score components. Root workspace and shared
contracts remain pending.

## Public API

Export a factory implementing `PlannerPort` from shared contracts. No database or vote persistence.

## Local commands

From this directory, run `npm install`, then `npm test`. No live provider or
Bright Data request is made by the current test suite.
