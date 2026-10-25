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
| DEV1-003 | done | DEV1-002 | OTP auth UI + mock AuthClient (OTP UI later replaced by email+password, ADR-003) |
| DEV1-004 | done | DEV1-003 | Groups UI + mock group client |
| DEV1-005 | done | DEV1-004 | Member setup + weekly settings UI |
| DEV1-006 | done | DEV1-005 | Planning + proposals UI |
| DEV1-007 | done | DEV1-006 | Voting, veto, confirmed event, notifications mocks |
| DEV1-008 | done | DEV1-007 | Gate 1 mobile exit |
| DEV1-009 | done | DEV1-008 | Supabase auth client + secure session; email+password replaces OTP UI (ADR-003, DEV1-009b); started before GATE2-EXIT with user approval; real sign-up verified on a phone, live /v1/me call not yet run |
| DEV1-010 | done | DEV1-009 | Real HTTP group + member-setup clients (groups, invites, members, preferences, availability); weekly schedule still local mock; live two-device run pending |
| DEV1-011 | partial | DEV1-010 | Real planning runs/proposals, vote, veto, confirmed event; notifications, ICS, push, vote tally, schedule remain mock/unavailable pending API routes |
| DEV1-012 | ready for device run | DEV1-011 | Privacy sweep done (no P0/P1), `docs/demo-mobile.md` written; physical-device checklist still to be run by a human |
| DEV1-011b | candidate | DEV1-011, DEV2-021..023 | Real weekly schedule, notifications feed and ICS export clients (ICS is a real .ics file via the share sheet, not verified on a device or calendar); vote tally and push registration remain unavailable (no API route); not run live |
| DEV1-013 | done | DEV1-011 | UI restyle from the Gather design system (visual only); on-device visual check pending |
| GATE2-001 | candidate | DEV2-010, DEV3 Gate 1 | Real `@gather/planner` wired into the API behind `PLANNER_IMPL=real`; backend output validation, failure/privacy tests; cross-lane, needs Dev 2/3 review |

Milestone: [`docs/milestone-dag.md`](../docs/milestone-dag.md)
