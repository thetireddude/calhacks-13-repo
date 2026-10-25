# Task Index — Gather (Developer 2)

Dev 2 owns the Core API rows below. Dev 3's planner DAG is listed after the mobile lane.

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
| DEV2-017 | merged | DEV2-016 | Votes / vetoes / confirmed events persistence |
| DEV2-018 | merged | DEV2-017 | `.env` load + CORS |
| DEV2-019 | merged | DEV2-011 | `GET /v1/groups` list mine |
| DEV2-020 | merged | DEV2-014 | `PUT /v1/me` displayName |
| DEV2-021 | merged | DEV2-019 | Group schedule stub (no auto-run) |
| DEV2-022 | merged | DEV2-017 | ICS export stub |
| DEV2-023 | merged | DEV2-017, DEV2-019 | Notifications feed stub |
| DEV2-024 | merged | DEV2-020 | Dev 1 API handoff doc |
| DEV2-025 | merged | DEV2-017 | Demo seed notes |

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

## Developer 3 (Planner)

| Task | Status | Depends on | Notes |
|------|--------|------------|-------|
| DEV3-001 | done | GATE0-003, ADR-002 planner rules | Reviewed planner vertical on `feature/planner` (29 tests) |
| DEV3-002 | candidate | DEV3-001 | Planner DTO contract proposal; PR #7 awaits Dev 1/Dev 2 sign-off |
| DEV3-003 | backlog | DEV3-002 | Compose authorized input, discovery, scoring, and explanations behind `PlannerPort` |
| DEV3-004 | blocked | DEV3-003 | Verify Creao/Claude Haiku adapter with non-committed credentials |
| DEV3-005 | blocked | DEV3-003 | Verify Bright Data live discovery with seeded fallback |
| GATE2-001 | backlog | DEV3-003, DEV2-023 | Integrate the real planner into the Core API |

Milestone: [`docs/milestone-dag.md`](../docs/milestone-dag.md)
