# DEV2-003 — Retro review gate

- **Task:** DEV2-003 — Schema: identity and groups
- **Scope reviewed:** `supabase/migrations/20261024180000_identity_and_groups.sql`, `supabase/README.md` (repo path; task allows `supabase/README.md`, not `supabase/README`)
- **Base:** `main` (already merged per `state/CURRENT.md`)
- **Reviewer role:** Gather Reviewer (`agents/reviewer.md`)

## 1. Verdict

**APPROVE**

Gate 1 deliverable matches task acceptance criteria and SPEC §4 logical resources for profiles, groups, memberships, and invitations. RLS is explicitly scoped as stubs with a documented hardening path. No P0/P1 findings for a migration-only retro on main; follow-ups below belong in DEV2-005+.

## 2. Findings (P0 → P3)

### P2 — Self-referential membership RLS may fail bootstrap reads

- **Area:** `supabase/migrations/20261024180000_identity_and_groups.sql` — policy `memberships_select_member`
- **Failure mode:** `SELECT` visibility is defined only via `EXISTS (SELECT 1 FROM public.group_memberships gm …)` on the same table. Under PostgreSQL RLS, inner scans are also policy-filtered, which commonly prevents a member from seeing even their own row (and therefore breaks `groups_select_member`, which depends on that subquery).
- **Why it matters:** Any PostgREST / Supabase client `SELECT` on memberships or groups will appear empty unless the API always uses the service role. Mobile is expected to use the API, but local debugging and future RLS tests will fail silently.
- **Smallest fix:** Extend the policy with a direct own-row clause, e.g. `user_id = auth.uid() OR exists (…)`, or replace the subquery with a `SECURITY DEFINER` helper `is_group_member(group_id uuid)` (preferred before demo). Track in DEV2-005 RLS hardening.

### P2 — No profile row bootstrap on signup

- **Area:** `public.profiles` — RLS enabled; only `SELECT`/`UPDATE` own row; no `INSERT` policy or `auth.users` trigger
- **Failure mode:** A newly OTP-authenticated user has no `profiles` row. `groups.created_by`, `group_memberships.user_id`, and `group_invitations.created_by` all reference `profiles(id)`, so group creation/join flows fail at FK enforcement unless the API (service role) inserts the profile first.
- **Why it matters:** DEV2-005 group routes must not assume a profile exists; missing insert is an easy integration footgun.
- **Smallest fix:** Add a follow-up migration: `INSERT` policy for own id **or** `on auth.users` trigger to `insert into public.profiles (id) values (new.id)`, plus document which path DEV2-005 uses.

### P2 — Write paths intentionally service-role-only (document in DEV2-005)

- **Area:** `groups`, `group_memberships`, `group_invitations` — RLS on, no `INSERT`/`UPDATE`/`DELETE` policies (invitations: no policies at all → default deny)
- **Failure mode:** None for Gate 1 if all mutations go through the Fastify API with service role; client-direct writes are correctly blocked.
- **Why it matters:** DEV2-005 implementer must not expose service role to mobile; README should state “mutations via API only until policies land.”
- **Smallest fix:** One sentence in `supabase/README.md` under RLS stubs; implement mutations only in API layer in DEV2-005.

### P3 — `profiles_update_own` lacks explicit `WITH CHECK`

- **Area:** policy `profiles_update_own`
- **Failure mode:** Unlikely abuse if column set is narrow, but Postgres best practice is `USING` + `WITH CHECK (auth.uid() = id)` on updates.
- **Smallest fix:** Add `with check (auth.uid() = id)` when tightening RLS.

### P3 — `group_memberships.role` is unconstrained text

- **Area:** `role text not null default 'member'`
- **Failure mode:** Typos or arbitrary values until SPEC §11 / ADR defines roles (owner, admin, member).
- **Smallest fix:** Defer until role model approved; then `CHECK (role IN (…))` in a small migration.

### P3 — README table formatting for DEV2-004 tables

- **Area:** `supabase/README.md` lines after DEV2-003 table
- **Failure mode:** `member_preferences` / `member_availability` rows sit outside the main markdown table (missing header separator continuity).
- **Smallest fix:** Single table or a “DEV2-004” subsection; does not block DEV2-003.

## 3. Missing tests

- No automated migration smoke or SQL policy tests in repo (task allows documented apply command).
- **Recommended (non-blocking for retro):** CI or dev script running `supabase db reset` when CLI available; optional pgTAP or scripted session tests for “member sees own group” once RLS bootstrap is fixed.

## 4. Architecture / contract drift

- **SPEC §4:** Delivers the four listed logical resources with sensible FK graph (`auth.users` → `profiles` → groups / memberships / invitations). Preferences and availability correctly live in a later migration (DEV2-004), not in this file.
- **Contracts:** No DTO or `packages/contracts` changes — none required for this task.
- **Privacy:** Profile RLS limits reads to self; group data limited to members; invitations denied to clients without policies — aligned with Gate 1 stub intent. No leak of availability/preferences in this migration.

## 5. Acceptance criteria check

| Criterion | Status |
|-----------|--------|
| Migrations apply on fresh local Supabase | Not re-run in this review (CLI absent in reviewer env); SQL is valid, ordered, uses `if not exists` |
| RLS stub or documented TODO | Met — comment in migration + README |
| README lists tables and ownership | Met for DEV2-003 tables; Dev 2 ownership stated |

## 6. Follow-ups for implementer (DEV2-005)

1. Profile bootstrap on first authenticated API call or auth trigger.
2. Harden membership/group RLS (bootstrap-safe read policies; invitation redeem policy design).
3. Document service-role-only mutations in README until client policies exist.
