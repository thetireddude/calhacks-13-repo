# DEV1-011b — Real schedule, notifications and ICS clients

## Status

candidate

## Dependencies

- DEV1-011, DEV2-021 (schedule), DEV2-022 (ICS), DEV2-023 (notifications), DEV2-024 (handoff doc)

## Execution

Primary role: implementer
Review required: yes
Tester required: yes
Developer lane: mobile
Branch: `agent/DEV1-011b-schedule-ics-notifications`

## Goal

Wire `apps/mobile` to the new API routes using the existing `httpClients.ts` pattern (Bearer auth, status-to-error mapping, no token in errors, POSTs single attempt).

## Allowed files

- `apps/mobile/**`, `docs/dev1-contract-requests.md`, `docs/demo-mobile.md`, `tasks/index.md`, `state/CURRENT.md`

## Done

- `GET/PUT /v1/groups/:groupId/schedule` -> `createHttpScheduleClient` (403 -> forbidden, 404 -> not_found; light client-side IANA timezone check, server authoritative); `ScheduleClient` now uses contract `GroupSchedule` (timezone + weeklyEnabled). The mobile-local weekday/time/deadline form and its validation were removed because the API stores no such fields. Config only; no auto-planning.
- `GET /v1/me/notifications` -> `listNotifications`; only `event_confirmed` items are mapped.
- `GET /v1/events/:eventId/calendar.ics` -> `createHttpIcsClient` via new `apiClient.requestText`; the text is written to a sanitized `.ics` file in the cache directory (`expo-file-system`) and opened in the system share sheet (`expo-sharing`, mimeType `text/calendar`). Added deps `expo-file-system ~58.0.11`, `expo-sharing ~58.0.20` (lockfile + `app.json` plugin updated). Not verified on a device or imported into a real calendar; SPEC §3 "ICS export works on the demo device" is not yet confirmed.
- Not wired (no route): vote state/tallies, push-device registration. `ListGroupsResponse`/`ListMembersResponse` do not exist in contracts, so inline wrapper types remain.

## Verification

contracts build, mobile typecheck, lint, test (310), and root `pnpm run test:ci` pass. Not run against a live API or device.
