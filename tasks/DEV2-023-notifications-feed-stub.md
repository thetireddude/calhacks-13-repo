# DEV2-023 — In-app notifications feed stub

## Status

implementing

## Dependencies

- DEV2-017
- DEV2-019

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Worktree required: yes  
Developer lane: core-api

## Goal

`GET /v1/me/notifications` returns a **group-visible** in-app feed derived from existing state. No push. No private prefs/availability.

## Allowed files

- `apps/api/src/notifications/routes.ts` (new)
- `apps/api/src/notifications.test.ts` (new)
- `apps/api/src/app.ts` — **only** `registerNotificationRoutes(app, groupsStore, planningStore, votingStore)` after voting routes

## Do not modify

- `apps/mobile/**`, `packages/planner/**`
- Group schedule (DEV2-021), ICS/voting store methods except reading existing `getConfirmedEvent` / `listGroupsForUser` / `getRun` if already public
- Do not persist a notifications table unless required; **derive on read**:
  - For each group the user belongs to: if a confirmed event exists → one item `{ type: "event_confirmed", groupId, eventId, summary, createdAt: confirmedAt }`
  - Optionally one item per completed planning run if you can list runs without new store APIs; if not, confirmed-event items only

## Requirements

- 401 without JWT.
- Never include other members’ prefs, availability, or raw votes.
- `pnpm run test:ci` passes.

## Handoff

Commit `DEV2-023:`, status `candidate`, no merge.
