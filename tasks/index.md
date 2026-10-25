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

## Developer 1 (Mobile)

| Task | Status | Depends on | Notes |
|------|--------|------------|-------|
| DEV1-001 | done | GATE0-001 | Expo bootstrap |
| DEV1-002 | done | DEV1-001 | Navigation + auth shell + logout |
| DEV1-003 | done | DEV1-002 | OTP auth UI + mock AuthClient |
| DEV1-004 | done | DEV1-003 | Groups UI + mock group client |
| DEV1-005 | done | DEV1-004 | Member setup + weekly settings UI |
| DEV1-006 | done | DEV1-005 | Planning + proposals UI |
| DEV1-007 | done | DEV1-006 | Voting, veto, confirmed event, notifications mocks |
| DEV1-008 | done | DEV1-007 | Gate 1 mobile exit |
| DEV1-009 | blocked | DEV1-008, GATE2-EXIT | HOLD: needs GATE2-EXIT (Dev 2/3 + orchestrator) and §9 contract decisions; not authored in mobile lane |
| DEV1-010 | blocked | DEV1-009 | Gate 3: real API groups + setup |
| DEV1-011 | blocked | DEV1-010 | Gate 3: real API planning/voting/events/notifications |
| DEV1-012 | blocked | DEV1-011 | Gate 5: mobile demo hardening |

Milestone: [`docs/milestone-dag.md`](../docs/milestone-dag.md)
