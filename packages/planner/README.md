# Gather Planner (`packages/planner`)

**Owner:** Developer 3  
**Branch:** `feature/planner`

Importable planning engine: personal-agent evaluations, discovery, deterministic scoring, explanations. See SPEC §5 and §6.3.

## Status

Implement **DEV3-001** after GATE0-001 and contract stubs.

## Public API

Export a factory implementing `PlannerPort` from shared contracts. No database or vote persistence.
