# Task Index — Gather (Developer 2)

Core API lane only. Other lanes own their tasks separately.

| Task | Status | Depends on | Notes |
|------|--------|------------|-------|
| GATE0-001 | done | META-001 | Monorepo + CI stub |
| GATE0-002 | done | GATE0-001 | `@gather/contracts` stubs |
| GATE0-003 | done | GATE0-002 | ADR-002 contract stub ack |
| DEV2-001 | done | GATE0-001 | Fastify `/v1/health` |
| DEV2-002 | done | DEV2-001 | JWT + `/v1/me` |
| DEV2-003 | done | DEV2-002, GATE0-003 | Identity + groups migrations |
| DEV2-004 | done | DEV2-003 | Preferences + availability migrations |
| DEV2-005 | done | DEV2-003 | Groups/invites/join/members API |
| DEV2-006 | done | DEV2-004, DEV2-005 | Prefs + availability API |
| DEV2-007 | done | DEV2-004 | Planning runs migration + routes |
| DEV2-008 | done | DEV2-007, GATE0-002 | Mock planner orchestration + ≤3 proposals |
| DEV2-009 | done | DEV2-008 | Vote + veto + confirmed-event skeleton (merged) |
| DEV2-010 | done | DEV2-009 | Gate 1 Dev 2 exit (docs + CI) |
| DEV2-011 | merged | DEV2-010 | Supabase groups store (env-gated) |
| DEV2-012 | merged | DEV2-010 | JWT iss/aud hardening |
| DEV2-013 | merged | DEV2-010 | Local setup docs + `.env.example` |
| DEV2-014 | merged | DEV2-011, DEV2-012 | Profiles + `GET /v1/me` persistence |
| DEV2-015 | merged | DEV2-011 | Prefs + availability persistence |
| DEV2-016 | merged | DEV2-014, DEV2-015 | Planning runs + proposals persistence |
| DEV2-017 | implementing | DEV2-016 | Votes / vetoes / confirmed events persistence |

Milestone: [`docs/milestone-dag.md`](../docs/milestone-dag.md)
