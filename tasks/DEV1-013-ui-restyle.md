# DEV1-013 — UI restyle from the Gather design system

## Status

in progress

## Dependencies

- DEV1-011 (real API planning/voting clients merged into `feature/mobile`)

## Execution

Primary role: implementer
Review required: yes
Tester required: yes
Developer lane: mobile
Branch: `agent/DEV1-013-ui-restyle`

## Goal

Restyle `apps/mobile` to match the Gather design system (`Gather — Mobile UI Kit.pdf`, 11 pages: design system + 10 screens). Visual only; no behavior, contract, or API changes.

## Allowed files

- `apps/mobile/**`
- `tasks/DEV1-013-ui-restyle.md`, `tasks/index.md`

## May modify if necessary

- `pnpm-lock.yaml` (font packages; integration owner to be told in the handoff)

## Do not modify

- `apps/api/**`, `supabase/**`, `packages/**`, root config, `.env*`

## Design tokens (from the PDF, page 1)

- Light: Coral `#FF6B4A`, Cream `#FFF8F3` (screen bg), Surface `#FFFFFF`, Ink `#2A1F1B`, Muted `#6B5C55`, Peach `#FFE0D2`, Butter `#FFF0BD`, Mint `#D6F0E3`, Sky `#DAEAFB`, Lilac `#E7DFFA`.
- Dark: Coral `#FF6B4A`, Night `#1B1513` (bg), Surface `#2A211E`, Ink `#FBEEE8`, Muted `#C4B1A8`, Peach `#4B2C23`, Butter `#473D1C`, Mint `#1E3B2E`, Sky `#1F3446`, Lilac `#352F52`.
- Type: Bricolage Grotesque (display/titles/headings) + DM Sans (body). Display 34/38, Title 24/30, Heading 18/24 bold, Body 16/24, Small 14/20, Label 12/16 uppercase tracking.
- Space/shape: 4/8/12/16/24/32 scale; input radius 16, card radius 24, pill radius full. Screen padding 24. Tap targets >= 48 high; buttons 56 high.
- Components: primary pill button (coral, ink text), secondary (peach), outline, disabled; vote buttons (default/selected/disabled; Veto = solid outline + stop-sign icon, Can't make it = dashed outline and calm); status chips (Voting=sky, Vetoed=outlined ink, Confirmed=mint, Planning=lilac); avatar stack with pastel initials; toggle; error banner with Retry; reconnecting banner (butter); skeleton and empty state; floating pill tab bar (Groups, Plans, Alerts, Profile) with coral active pill.

## Guardrails (design vs product — non-negotiable)

- Vote choices are only `approve` ("Yes") and `cant_make_it`; do NOT add "Maybe" (no contract support). Veto stays a separate action, visually distinct from "Can't make it".
- Do NOT add client-side tallies, "N of M have voted", scores, percentages, or fairness text. Show vote counts only when the backend view supplies them (existing optional-counts logic).
- Do not show data the API does not provide (host name, per-person "Going" status, cost per person) as if real; render only fields that exist in the DTOs/views.
- Sign-in is email + password (ADR-004), not the design's 6-digit code screen: use the design's look (hero, headline, input, coral CTA).
- Keep all existing accessibility labels and test IDs; keep every screen's behavior and strings that tests assert, or update tests only for pure copy/layout changes and say so.
- No new native modules beyond Expo font packages; the app must still run in Expo Go.

## Acceptance criteria

- Theme tokens, fonts, light/dark mode (follows system), and shared components exist and are used by all screens.
- All 10 design screens are restyled where the app has a corresponding screen.
- Typecheck, lint and all mobile tests pass.

## Handoff

Commit `DEV1-013:` on `agent/DEV1-013-ui-restyle`. Report files changed, commands run, design deviations, and any SPEC §9 requests (e.g. "Maybe" vote, host/attendee DTO fields).
