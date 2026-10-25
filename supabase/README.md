# Supabase

**Owner:** Developer 2

## Local (DEV2-002)

1. Install [Supabase CLI](https://supabase.com/docs/guides/cli).
2. From repo root: `supabase start` (uses `supabase/config.toml`).
3. Set `SUPABASE_JWT_SECRET` in `.env` from `supabase status` JWT secret for API token verification.

## Migrations (DEV2-003)

| Table | Purpose |
|-------|---------|
| `profiles` | User profile row keyed to `auth.users` |
| `groups` | Friend group |
| `group_memberships` | Member ↔ group |
| `group_invitations` | Invite token for join flow |

Apply: `supabase db reset` or `supabase migration up` (local CLI).

RLS policies are **Gate 1 stubs** — harden before demo.

| `member_preferences` | **Private** — owner only (RLS) |
| `member_availability` | **Private** — owner only (RLS) |

Next: **DEV2-005** group API routes; **DEV2-006** prefs/availability API.
