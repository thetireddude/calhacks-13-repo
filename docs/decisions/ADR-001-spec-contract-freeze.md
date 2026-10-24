# ADR-001: SPEC v1.1 contract freeze as product source of truth

## Status

Accepted

## Context

Gather is built by three developers in parallel with strict directory ownership and integration gates. SPEC.md v1.1 (2026-10-24) records approved decisions and explicitly lists unresolved items.

## Decision

1. [`SPEC.md`](../../SPEC.md) is the authoritative product and ownership contract until superseded by a team-approved SPEC revision.
2. Items in SPEC §11 remain **open**; agents and developers must not silently approve them in code.
3. Interface changes follow SPEC §9: propose, affected-developer review, Developer 2 updates `packages/contracts` after agreement.
4. Agent workflow files (`AGENTS.md`, `tasks/`, `state/`) operationalize SPEC for harnesses but do not override SPEC on product rules.

## Consequences

- Tasks reference SPEC sections for acceptance criteria where applicable.
- Blockers for unresolved decisions are recorded in `state/CURRENT.md`.
- Contract freeze (Gate 0) requires explicit DTO and planner schema approval beyond this ADR.
