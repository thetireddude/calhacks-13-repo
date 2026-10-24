# Gather — Three-Developer Engineering Specification

**Version:** 1.1 — Contract Freeze  
**Date:** October 24, 2026  
**Status:** Approved decisions frozen; remaining decisions tracked  
**Team:** Three developers  
**Target:** Cal Hacks 13.0 — Meta Track

---

# 1. Product requirements

Gather helps established friend groups of approximately 4–10 people turn vague hangout intentions into confirmed plans without repeatedly excluding the same members.

## Required MVP journey

1. User authenticates with Supabase email OTP.
2. User creates or joins a group.
3. User provides preferences and manual availability.
4. Any authorized member initiates a planning request, or a scheduled weekly planning run begins.
5. Private personal-agent evaluations inform the group planner.
6. The planner discovers and ranks up to three plans.
7. Group members vote.
8. An explicitly vetoed proposal can be revised and submitted for another vote.
9. A proposal meeting the approved consensus rule becomes confirmed.
10. All group members can view the confirmed event, even those who declined.
11. Members may export the event to their calendars using ICS.

The system must also support the group's next scheduled planning run, in-app notifications, and opted-in inclusion history.

---

# 2. Architecture decisions

## Confirmed technologies

| Layer | Technology |
|---|---|
| Mobile | React Native + Expo |
| Authentication | Supabase email OTP |
| Database | Supabase |
| Backend | Node.js + TypeScript |
| Planner | Imported TypeScript package |
| Agent execution | Individual LLM evaluations; provider not yet approved |
| Candidate AI platform | Creao, subject to API/credit verification |
| Local event discovery | Bright Data |
| Discovery fallback | Seeded activity data |
| Notifications | Expo push and in-app feed |
| Calendar | ICS export |
| Availability | Manual entry plus seeded data |
| Primary demo | Physical phones |

## Planning engine boundary

The planner is an imported TypeScript package, not an independently deployed service.

The API calls the planner through an exported function/interface.

The planner:
- Accepts authorized planning inputs.
- Performs individual agent evaluations.
- Retrieves activity candidates.
- Evaluates hard constraints.
- Calculates deterministic rankings.
- Generates privacy-safe explanations.
- Returns structured proposals.

The backend:
- Validates users and membership.
- Loads authorized planning data.
- Invokes the planner.
- Persists proposals.
- Manages voting and confirmation.
- Enforces group scheduling.
- Delivers notifications.

The mobile app:
- Collects user input.
- Displays authoritative backend state.
- Handles voting interactions.
- Displays notifications and calendar actions.

## Provider boundary

Creao is assigned to Developer 3 for integration assessment and implementation if selected.

Its model, agent configurations, latency, credit eligibility, and precise execution contracts are still unapproved.

Developer 3 must provide an adapter so that application code does not depend directly on Creao-specific response objects.

---

# 3. Developer 1 — Mobile application

**Branch:** `feature/mobile`  
**Exclusive directory:** `apps/mobile/**`

## Responsibilities

### Authentication

- Email entry screen.
- OTP code submission.
- Authenticated navigation.
- Logout.
- Session handling using approved Supabase interfaces.
- Invalid/expired OTP error states.

### Group management

- Create group UI.
- Join through invitation link.
- Group member display.
- Group dashboard.

### Member setup

- Activity preferences.
- Budget range.
- Travel radius.
- Manual availability.
- Learning opt-in/out.
- Notification permission request.
- Weekly planning settings UI.

A user who denies notification permission must still be able to use Gather through the in-app notification feed.

### Planning

- Manual planning initiation.
- Natural-language activity request input.
- Planning progress/status.
- Up to three plan proposals.
- Ranked proposal explanations.
- Aggregate attendance counts.
- Inclusion-aware alternative display.

### Voting

- Interested.
- Can't make it.
- Suggest another.
- Separate veto control for authorized users.
- Revision and revote UI.
- Voting deadline display.
- Confirmation and cancellation states.

### Confirmed events

- Upcoming hangout details.
- Member-visible confirmed plan.
- ICS export action.
- In-app notification history.

## Restrictions

Developer 1 must not modify:
- Supabase migrations.
- Backend route implementations.
- Voting business rules.
- Planner scoring logic.
- Bright Data integration.
- Creao integration.
- Shared contracts without review.

## Independent testing

Use API mock fixtures that match approved contracts.

Do not create frontend-only interpretations of voting or fairness that could differ from backend rules.

## Acceptance tests

- OTP login can complete on a physical demo device.
- Group creation/joining UI works.
- Preferences persist through API integration.
- Denying push permission does not block onboarding.
- Proposals display correctly.
- Voting and veto states render accurately.
- Confirmed events are accessible to declining members.
- ICS export works on the demo device.
- No protected personal data is displayed.

---

# 4. Developer 2 — Core backend and Supabase

**Branch:** `feature/core-api`

**Exclusive directories:**
- `apps/api/**`
- `supabase/**`
- `packages/contracts/**`

## Responsibilities

### Authentication and authorization

- Validate Supabase email OTP sessions.
- Map authenticated users to group membership.
- Enforce protected endpoints.
- Prevent unauthorized access to personal data.

### Persistence

Design and maintain the Supabase schema for these logical resources:

- User profiles.
- Groups.
- Memberships.
- Invitations.
- Preferences.
- Availability.
- Group scheduling settings.
- Planning runs.
- Proposals.
- Proposal revisions.
- Votes.
- Explicit veto records.
- Confirmed hangouts.
- Inclusion history.
- Notifications.
- Push-device registrations.

Logical resources may be implemented using the final approved relational schema.

### Backend API

Implement endpoints for:

- Current user.
- Group creation and joining.
- Group membership.
- Preferences.
- Availability.
- Weekly schedule configuration.
- Planning initiation.
- Planning run status.
- Proposal retrieval.
- Voting.
- Explicit veto.
- Proposal revision state.
- Confirmation.
- Confirmed event retrieval.
- ICS delivery.
- In-app notifications.
- Push-device registration.

### Planning orchestration

- Construct authorized planner inputs.
- Import Developer 3's planner package.
- Invoke the planner.
- Validate returned proposals.
- Persist results.
- Handle errors without corrupting planning state.

### Weekly scheduling

The group must be able to configure:

- Planning weekday.
- Planning time.
- Voting deadline.

The backend must:
- Run planning automatically according to the approved schedule.
- Prevent duplicate scheduling for the same group and planning window.
- Invoke the same planner used by manual requests.
- Open voting.
- Notify group members.
- Enforce the voting deadline.

The scheduling mechanism and timezone handling remain pending approval.

### Voting and confirmation

- Enforce the approved majority rule.
- Keep explicit veto distinct from Can't make it.
- Support proposal revision and revoting.
- Enforce voting deadlines.
- Ensure confirmation is performed once.
- Handle post-confirmation change/cancellation voting.
- Make confirmed events accessible to all authorized members.

### Privacy

- Restrict member access to private preferences and availability.
- Preserve learning opt-out.
- Return only permitted group-visible planning information.
- Prevent exposure of private event details.

## Restrictions

Developer 2 must not:
- Implement planner scoring independently.
- Modify AI prompts and provider adapters.
- Modify frontend UI.
- Change agreed contracts without affected-developer approval.

## Independent testing

Use a mock `PlannerPort` implementation conforming to shared types.

The backend must be testable without live Creao or Bright Data credentials.

## Acceptance tests

- Protected endpoints enforce membership.
- Private data access restrictions hold.
- OTP-authenticated sessions are validated.
- Manual planning works with the mock planner.
- Scheduled planning runs are not duplicated.
- Vote state persists correctly.
- Veto triggers approved revision behavior.
- Concurrent votes do not cause duplicate confirmations.
- Confirmed events remain accessible to all group members.
- Planner failures produce recoverable states.

---

# 5. Developer 3 — Planner, AI agents, and event discovery

**Branch:** `feature/planner`  
**Exclusive directory:** `packages/planner/**`

## Responsibilities

### Agent integration

- Implement provider abstraction.
- Evaluate Creao against the team's available credits and required API functionality.
- Implement the approved provider integration.
- Handle asynchronous execution where required.
- Validate model outputs.
- Enforce execution budgets and error handling.
- Exclude unnecessary private information from provider inputs.

### Personal-agent evaluations

- Evaluate permitted personal preferences.
- Evaluate manual or seeded availability.
- Respect budget and travel constraints.
- Use persistent history only when opted in.
- Produce constrained evaluations for the group planner.
- Prevent unapproved details from entering public proposal explanations.

### Bright Data integration

- Retrieve public activity candidates.
- Normalize retrieved activity data.
- Track source type and data availability.
- Handle incomplete prices, locations, or dates.
- Use seeded fallback candidates when the provider fails.

### Deterministic scoring

Approved category weights:

| Dimension | Weight |
|---|---:|
| Expected attendance | 45% |
| Shared preference fit | 30% |
| Budget/travel fit | 15% |
| Inclusion fairness | 10% |

These weights are fixed.

The individual score formulas, normalization, exclusions, and tie rules remain unresolved.

Do not implement arbitrary scoring formulas and label them approved.

### Inclusion fairness

The system must:
- Distinguish repeated genuine exclusion from voluntary declines.
- Avoid treating a person who opts out of learning as having an inferred preference history.
- Preserve opted-in inclusion history.
- Reduce inclusion debt gradually when appropriate.
- Surface a meaningful alternative when a more inclusive option is available.

The precise update and decay formulas remain subject to approval.

### Explanation generation

AI may:
- Explain why a plan is recommended.
- Explain aggregate preference and attendance tradeoffs.
- Describe the value of an inclusion-aware alternative.

AI may not:
- Decide eligibility.
- Manipulate votes.
- Override deterministic scores.
- Invent attendance information.
- Reveal private histories or calendar details.

## Restrictions

Developer 3 must not:
- Modify database migrations.
- Write group membership or authentication code.
- Implement backend routes.
- Modify frontend screens.
- Persist voting or confirmation outcomes.

## Independent testing

Use frozen planner input fixtures.

Test:
- Personal-agent output parsing.
- Privacy-safe input preparation.
- Deterministic scoring.
- Bright Data normalization.
- Provider fallback.
- Inclusion scenarios.
- Planner response validation.

## Acceptance tests

- Planner package imports successfully into the backend.
- Valid planning input generates no more than three proposals.
- Unavailable provider responses fail safely.
- Seeded discovery fallback works.
- Personal private histories never appear in public output.
- Scoring is reproducible from the same deterministic inputs.
- Inclusion rules match approved test cases.
- Explanations are consistent with actual ranking results.

---

# 6. Shared contracts

## 6.1 Ownership

Developer 2 maintains shared contracts in:

`packages/contracts/**`

However, contract changes require review from affected developers.

Developer 2 cannot unilaterally change the planner's public interface or frontend API DTOs.

## 6.2 Core API route inventory

The following proposed routes are retained from the earlier specification:

| Method | Route |
|---|---|
| GET | `/v1/me` |
| POST | `/v1/groups` |
| GET | `/v1/groups/:groupId` |
| POST | `/v1/groups/:groupId/invites` |
| POST | `/v1/invites/:token/join` |
| GET | `/v1/groups/:groupId/members` |
| GET/PUT | `/v1/me/preferences` |
| GET/PUT | `/v1/me/availability` |
| GET/PUT | `/v1/groups/:groupId/schedule` |
| POST | `/v1/groups/:groupId/planning-runs` |
| GET | `/v1/planning-runs/:runId` |
| GET | `/v1/planning-runs/:runId/proposals` |
| PUT | `/v1/proposals/:proposalId/vote` |
| POST | `/v1/proposals/:proposalId/veto` |
| GET | `/v1/groups/:groupId/confirmed-event` |
| GET | `/v1/events/:eventId/calendar.ics` |
| GET | `/v1/me/notifications` |
| POST | `/v1/me/push-devices` |

**Status:** Proposed interface inventory. Route names and payload schemas require API contract approval.

## 6.3 Planner interface

The imported package must expose a single documented entry point to the backend.

Proposed TypeScript boundary:

```ts
export interface PlannerPort {
  generatePlans(
    input: PlannerInput
  ): Promise<PlannerResult>;
}
```

Developer 2 provides the authorized `PlannerInput`.

Developer 3 implements the planner and returns a schema-validated `PlannerResult`.

The backend owns all persistence and final confirmation decisions.

The planner cannot directly modify votes or confirmed events.

## 6.4 API contract freeze requirements

Before independent implementations depend on the contracts, approve:

- DTO names and required fields.
- Authentication credential handling.
- Date and timezone representation.
- Budget and currency representation.
- Availability format.
- Group membership references.
- Planning-run state values.
- Proposal revision/version identifiers.
- Vote submission and veto format.
- Error response schema.
- Planner input/output schema.
- Notification payload format.
- ICS delivery contract.

A contract is frozen only after both its producer and consumer approve it.

---

# 7. Git workflow and ownership rules

## 7.1 Branches

```text
main
feature/mobile
feature/core-api
feature/planner
```

These branches must originate from the same agreed base commit.

## 7.2 Root configuration

Shared files require an integration owner.

Examples:
- Root package manifest.
- Workspace configuration.
- Root TypeScript configuration.
- Lockfile.
- CI configuration.
- Shared environment templates.
- Root README.

**Integration owner is still unassigned.**

No developer is authorized by this specification to independently make competing changes to shared root configuration.

## 7.3 Cross-team dependency rules

- Frontend imports shared API DTOs, not backend internals.
- Backend imports the planner's public entry point, not private planner modules.
- Planner imports shared types, not backend services.
- Planner does not import database or UI code.
- Backend remains the only owner of application persistence.
- No direct circular dependencies.

## 7.4 Pull requests

Each PR must contain:
- Summary of changes.
- Owned paths modified.
- Contract changes, if any.
- Environment variables introduced.
- Tests run.
- Integration dependencies.
- Known unresolved issues.

Contract-breaking changes require agreement before merging.

---

# 8. Integration gates

## Gate 0 — Architecture and contract freeze

**Required approvals:**
- Package manager and workspace setup.
- Integration owner.
- Exact public interfaces.
- Planner input/output schema.
- API DTO schema.
- Development/testing conventions.

**Exit condition:** All three branches can be created from a committed, consistent scaffold.

## Gate 1 — Independent vertical components

Developer 1:
- Screens and navigation.
- API-mocked onboarding, planning, voting, confirmation.

Developer 2:
- Authentication and Supabase schema.
- API skeleton.
- Planning workflow using mocked planner output.

Developer 3:
- Importable planner package.
- Seeded candidate discovery.
- Provider adapters.
- Provisional scoring implementation only where formulas are approved.

**Exit condition:** Each owned module builds/tests independently and respects the frozen public interfaces.

## Gate 2 — Planner integration

- Merge the planner package into the integration base.
- Verify the package imports into the backend.
- Run actual planner outputs through backend schema validation.
- Verify persistence and privacy behavior.
- Test provider failures.

**Exit condition:** Backend creates and stores proposals from the imported planner.

## Gate 3 — Mobile integration

- Merge the mobile code into the integration base.
- Connect OTP authentication.
- Replace API mocks with real backend calls.
- Verify group membership and planning state.
- Test multiple device sessions.

**Exit condition:** Users can initiate planning and vote through the physical-phone application.

## Gate 4 — Product rules

- Finalize fairness formulas.
- Finalize veto and revote behavior.
- Finalize majority threshold and voting deadlines.
- Verify inclusion history and opt-out behavior.
- Verify automatic weekly planning.
- Verify confirmed-event distribution.

**Exit condition:** All business-rule acceptance tests pass.

## Gate 5 — Demo and release

- Run complete end-to-end demonstration.
- Verify live Bright Data and seeded fallback.
- Verify agent execution or approved fallback.
- Test notification denial and in-app feed.
- Export ICS.
- Validate no sensitive values or secrets are exposed.
- Record a demonstration fallback.

**Exit condition:** A complete Gather workflow works on the selected physical phones.

---

# 9. Contract-change and merge policy

During implementation:

1. A developer identifies a required interface change.
2. The developer records the proposed change and reason.
3. All affected developers review it.
4. Developer 2 updates shared contracts after agreement.
5. Consumers update their implementations.
6. Relevant contract tests pass.
7. The integration owner merges the approved changes.

No developer modifies another developer's source files to quickly fix an integration mismatch without agreement.

A successful Git merge is not sufficient proof of a successful integration.

---

# 10. Final acceptance tests

## Authentication
- [ ] Email OTP can be requested and completed.
- [ ] Expired/invalid code handling works.
- [ ] Protected API requests validate authentication.

## Groups
- [ ] Group can be created.
- [ ] Member can join using invitation.
- [ ] Multiple groups per user are supported in data architecture.

## Privacy
- [ ] Private availability is not exposed to other members.
- [ ] Raw preference history is not exposed.
- [ ] Opted-out historical learning data is not used by the planner.
- [ ] AI outputs are validated and privacy-filtered.

## Planning
- [ ] Manual planning works.
- [ ] Configurable weekly planning works.
- [ ] Planning runs are not duplicated.
- [ ] Up to three valid proposals are returned.
- [ ] Deterministic weighted ranking is applied.
- [ ] Bright Data and seeded fallback pathways function.

## Voting
- [ ] Interested, Can't make it, and Suggest another work.
- [ ] Explicit veto is separate.
- [ ] Vetoed proposals support revision and revoting.
- [ ] Approved majority rule is enforced.
- [ ] Concurrent votes do not produce duplicate confirmations.

## Inclusion
- [ ] Genuine repeated exclusion can affect ranking.
- [ ] Voluntary declines do not create incorrect exclusion debt.
- [ ] Opt-outs are respected.
- [ ] Inclusion history decreases according to approved rules.

## Notifications
- [ ] Push permission is optional.
- [ ] Denied push permission does not prevent use.
- [ ] In-app feed remains usable.
- [ ] Proposals and confirmations generate notifications.

## Confirmed event
- [ ] All group members can view confirmed plans.
- [ ] Declining members retain access.
- [ ] ICS export works.
- [ ] No member's calendar is silently modified.
- [ ] Changes/cancellations follow another approved group vote.

## Deployment
- [ ] Mobile app runs on physical demo devices.
- [ ] Backend and planner integrate successfully.
- [ ] Supabase permissions are correct.
- [ ] Provider credentials are not exposed.
- [ ] Demo remains functional using seeded fallback data.

---

# 11. Remaining unresolved decisions

These decisions remain open and must not be guessed.

### Build and integration

- Integration/merge owner.
- Root package manager.
- Workspace setup and dependency version conventions.
- Test framework and CI requirements.
- Final route and planner DTO schemas.

### AI and discovery

- Final LLM provider/model and Creao configuration.
- Bright Data product and source-specific data representation.
- Creao timeout, retry, and fallback behavior.
- Personal-agent evaluation schema.

### Planning and fairness

- Exact component-score formulas and normalization.
- Definition of a genuine missed opportunity.
- Inclusion debt accumulation and gradual decay.
- Ranking tie-breaker.
- Hard budget/travel eligibility rules.

### Voting

- Whether veto is permitted for all members.
- Whether a veto blocks one proposal version or the whole planning round.
- How revisions are created.
- Whether previous votes carry forward to revisions.
- Exact majority denominator.
- Confirmation at deadline versus early confirmation.
- Deadline expiration and tie handling.
- Post-confirmation revision/cancellation thresholds.

### Weekly scheduling

- Scheduler technology.
- Group timezone representation.
- Default scheduling configuration, if any.
- Handling schedule changes while a round is active.
- What happens if no feasible plan exists.
- Automatic retry behavior.

### Mobile behavior

- Device registration and push delivery details.
- ICS serialization responsibility.
- Final QR/invitation implementation details.

**No unresolved item is silently approved by this contract freeze.**

---

# 12. Deliverables by developer

## Developer 1
A working Expo mobile application with authentication, group experience, planning UI, voting, notifications, and event export.

## Developer 2
A running Node.js backend with Supabase persistence, secure group operations, scheduled planning, voting, confirmation, and the imported planner integration.

## Developer 3
An importable TypeScript planner with personal-agent evaluations, Creao/provider adapter, Bright Data ingestion, seeded fallback, deterministic scoring, inclusion handling, and explanation generation.

## Integration owner
Still unassigned. Responsible for shared root configuration, merging, integrated testing coordination, and final build validation.

**Completion criterion:** All three owned components work independently and integrate into one functional Gather mobile application without unapproved interface changes.
