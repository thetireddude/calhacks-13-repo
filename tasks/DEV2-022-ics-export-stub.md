# DEV2-022 — ICS export stub

## Status

implementing

## Dependencies

- DEV2-017

## Execution

Primary role: implementer  
Review required: yes  
Tester required: yes  
Worktree required: yes  
Developer lane: core-api

## Goal

`GET /v1/events/:eventId/calendar.ics` returns a privacy-safe ICS for a **confirmed** event. Do not write anyone’s calendar. No other members’ private data in the file.

## Allowed files

- `apps/api/src/voting/store.ts`, `supabaseStore.ts`, `routes.ts`, `voting.test.ts`

## Do not modify

- `apps/mobile/**`, `packages/planner/**`, `apps/api/src/app.ts`
- Groups/schedule (DEV2-021), notifications (DEV2-023)
- ConfirmedEvent DTO (no start/end in contract) — use `confirmedAt` as DTSTAMP; VEVENT can be a 1-hour block starting at `confirmedAt`. SUMMARY = event.summary only.

## Requirements

- JWT + caller must be a member of the event’s group. 401 / 403 / 404.
- `Content-Type: text/calendar` (or `text/calendar; charset=utf-8`).
- ICS must include BEGIN:VCALENDAR / VEVENT / UID (event id) / SUMMARY / DTSTAMP. No other users’ emails or availability.
- Add `getConfirmedEventById(eventId)` on VotingStore (in-memory + supabase).
- `pnpm run test:ci` passes.

## Handoff

Commit `DEV2-022:`, status `candidate`, no merge.
