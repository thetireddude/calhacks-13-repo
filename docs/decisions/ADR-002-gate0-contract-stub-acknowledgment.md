# ADR-002: Gate 0 contract stub acknowledgment (GATE0-003)

## Status

Accepted (orchestrator record for Gate 1 development)

## Context

GATE0-002 merged `PlannerPort` and planner DTO stubs (`CONTRACTS_VERSION 0.1.0-stub`). Full REST DTO freeze remains SPEC §6.4 / §11.

## Decision

Gate 1 implementation may proceed against **`@gather/contracts` planner stubs** on `main`. REST API shapes may be added incrementally in DEV2-005+ with consumer review before breaking changes.

Formal sign-off from Dev 1 and Dev 3 teammates is recommended when they pull `main`; this ADR unblocks DEV2-003+ and parallel lanes.

## Consequences

- DEV2-007+ may add contract types as needed with version bumps.
- GATE0-003 human review can be recorded in PR comments or team chat; ADR satisfies orchestrator dependency.
