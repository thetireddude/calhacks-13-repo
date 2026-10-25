# Developer 1 contract and API requests (SPEC §9)

Raised by the mobile lane while wiring DEV1-009..013. Dev 2 owns `packages/contracts/**` and `apps/api/**`; each item needs agreement from Dev 1, 2 and 3 before it changes. Earlier requests (a to e6) are in [`gate1-dev1-exit.md`](gate1-dev1-exit.md).

| # | Request | Why mobile needs it | Current mobile behavior |
|---|---------|---------------------|-------------------------|
| 1 | Vote-state route: counts, status, deadline, vote/veto allowed, and the caller's own vote and veto | Voting UI is driven by it; own vote is lost on app restart | Real mode hardcodes open/allowed, shows "Vote counts are not available yet." |
| 2 | Vote and veto responses (or proposal status) that say whether the proposal was vetoed or confirmed | UI cannot show the outcome until the confirmed-event fetch | No outcome shown |
| 3 | Notifications feed route and DTO | In-app feed | **Resolved (route)** by DEV2-023: `GET /v1/me/notifications` is wired. Open: the item type is declared only in `apps/api`, not `@gather/contracts`; mobile mirrors it locally. |
| 4 | ICS export route/delivery | Add to calendar | **Resolved** by DEV2-022: `GET /v1/events/:eventId/calendar.ics` is wired; the text is saved as a .ics file and handed to the OS share sheet (nothing is added to a calendar silently). Mobile writes it to a .ics cache file and opens the share sheet; not verified on a device. |
| 5 | Push-device registration route | Push notifications | Permission prompt only |
| 6 | Weekly schedule route and DTO (`/v1/groups/:id/schedule`) | Weekly planning settings | **PARTIAL.** DEV2-021 added `GroupSchedule` (`timezone`, `weeklyEnabled`), which is wired. Still open: weekday / planning time / voting-deadline configuration required by SPEC §3 has no DTO; auto-planning behavior undecided (SPEC §11). The old mobile weekday/time/deadline fields were dropped. |
| 7 | Frozen planning-run status set and error schema; retry semantics | Mobile keys on pending/completed/failed; maps errors by HTTP status | Status strings pending/completed/failed assumed |
| 8 | `ListGroupsResponse` and `ListMembersResponse` types in contracts; display name on members | Group list and members screens | Still open: contracts still has no list wrapper types or notification DTO; wrappers stay inline. Members show IDs |
| 9 | Proposal fields for place, time and cost per person | Design shows them on proposal cards | Not shown; only summary and explanation |
| 10 | "Maybe" vote choice (design shows it) and "Suggest another" (SPEC §3) | Design and SPEC list them | Not offered; "Suggest another" is a disabled placeholder |
| 11 | Cancelled-event representation and distinct "no event" vs "unknown group" on confirmed-event | Event states | Every 404 shown as no event; only `confirmed` supported |
| 12 | Async planning (or documented timeout) | `POST /planning-runs` plans inline; a slow planner may exceed the HTTP timeout | Mobile polls only while status is pending |
| 13 | API should validate `timezone` as an IANA zone on `PUT /v1/groups/:id/schedule` | Today any non-empty string is accepted and persisted | Mobile runs a light client-side `Intl` check only; the server must stay authoritative |
