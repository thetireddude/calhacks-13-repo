# Gather — Integration Roadmap

Task-level work is tracked in [`tasks/index.md`](../tasks/index.md). Milestone narrative follows SPEC §8.

## Gate 0 — Architecture and contract freeze

**Exit:** All three feature branches can be created from a committed, consistent scaffold.

Required before heavy parallel implementation:

- Package manager and workspace setup (integration owner TBD)
- Public interfaces: API DTOs, `PlannerPort`, auth credential handling
- Development/testing conventions

**Active tasks:** `GATE0-*`, `CONTRACT-*`, `META-001` (done)

## Gate 1 — Independent vertical components

| Lane | Exit signal |
|------|-------------|
| Developer 1 | Screens + API-mocked flows (onboarding → vote → confirmed event) |
| Developer 2 | Auth, schema, API skeleton, planning workflow with mock planner |
| Developer 3 | Importable planner, seeded discovery, provider adapters, approved scoring only |

## Gate 2 — Planner integration

Backend imports real planner; schema validation; persistence; provider failure handling.

## Gate 3 — Mobile integration

Real OTP, real API, multi-device sessions on physical phones.

## Gate 4 — Product rules

Fairness formulas, veto/revote, majority rule, inclusion history, weekly planning—per approved tests.

## Gate 5 — Demo and release

End-to-end demo on physical devices; notifications; ICS; no exposed secrets; seeded fallback viable.

## Branch model

```text
main
feature/mobile      → apps/mobile/**
feature/core-api    → apps/api/**, supabase/**, packages/contracts/**
feature/planner     → packages/planner/**
```

Branches should share the same Gate 0 base commit.
