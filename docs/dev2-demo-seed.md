# Developer 2 — demo seed (no secrets)

**Owner:** Developer 2 (`feature/core-api`)  
**Task:** DEV2-025

Seed a **two-member demo group** in a **cloud** Supabase project **after** Auth users already exist. This is operator documentation only. Do **not** commit service-role keys, JWTs, passwords, or real user emails.

There is **no** committed seed script. Do not add a script that embeds `SUPABASE_SERVICE_ROLE_KEY`.

Local Docker setup is a different path: [`dev2-local-setup.md`](dev2-local-setup.md). Schema/RLS: [`../supabase/README.md`](../supabase/README.md).

## Prerequisites

- Cloud project already created; migrations applied (`supabase/migrations/`).
- `public.groups.created_by` and `public.group_memberships.user_id` reference `public.profiles(id)`, which references `auth.users(id)`. Auth users **must** exist before profiles, groups, or memberships.
- API running against that project (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` in a **local** `.env` only). Without those env vars, `apps/api` keeps groups **in memory** (CI default) and SQL inserts will not show up on the HTTP API.

Replace every `<ANGLE_BRACKET>` value with your own copies. Never paste live keys into git, chat, or screenshots.

| Placeholder | Meaning |
|-------------|---------|
| `<SUPABASE_URL>` | Project API URL (Dashboard → Project Settings → API) |
| `<SUPABASE_SERVICE_ROLE_KEY>` | Service-role key (server-only; bypasses RLS). Copy locally; do not print it. |
| `<API_PUBLIC_URL>` | Gather API origin (e.g. `http://localhost:3000`) |
| `<AUTH_USER_ID_A>` / `<AUTH_USER_ID_B>` | UUIDs from **Authentication → Users** |
| `<ACCESS_TOKEN_A>` / `<ACCESS_TOKEN_B>` | Session JWTs from Auth for those users |
| `<GROUP_ID>` / `<INVITE_TOKEN>` | Values returned by create-group / create-invite |

## 1. Create two Auth users

1. Open the cloud project **Authentication → Users**.
2. Add two users (email/password or magic link). Dashboard creation is enough; do not store their passwords in this repo.
3. Copy each user’s **UUID** (`id`). Those become `<AUTH_USER_ID_A>` and `<AUTH_USER_ID_B>`.

There is no trigger that inserts `public.profiles` on signup. Either insert profiles in SQL (section 2) or let the API upsert them on first group/invite/join (section 3).

## 2. SQL path (service role / SQL editor)

Run in **Dashboard → SQL Editor** (runs as the project role that can write past RLS) **or** `psql` with a local connection string. Do not commit the connection string.

```sql
-- Replace UUIDs. Do not commit real ids from a shared/prod project if they identify people.
insert into public.profiles (id, display_name)
values
  ('<AUTH_USER_ID_A>', 'Demo A'),
  ('<AUTH_USER_ID_B>', 'Demo B')
on conflict (id) do nothing;

insert into public.groups (id, name, created_by)
values (
  '11111111-1111-4111-8111-111111111111',
  'Demo group',
  '<AUTH_USER_ID_A>'
)
on conflict (id) do nothing;

insert into public.group_memberships (group_id, user_id, role)
values
  ('11111111-1111-4111-8111-111111111111', '<AUTH_USER_ID_A>', 'member'),
  ('11111111-1111-4111-8111-111111111111', '<AUTH_USER_ID_B>', 'member')
on conflict (group_id, user_id) do nothing;
```

Optional: same inserts via PostgREST with the **service role** header. The value after `Bearer` is a placeholder — never log or commit the real key.

```bash
curl -sS -X POST '<SUPABASE_URL>/rest/v1/profiles' \
  -H 'apikey: <SUPABASE_SERVICE_ROLE_KEY>' \
  -H 'Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>' \
  -H 'Content-Type: application/json' \
  -H 'Prefer: resolution=merge-duplicates' \
  --data '[{"id":"<AUTH_USER_ID_A>","display_name":"Demo A"},{"id":"<AUTH_USER_ID_B>","display_name":"Demo B"}]'

curl -sS -X POST '<SUPABASE_URL>/rest/v1/groups' \
  -H 'apikey: <SUPABASE_SERVICE_ROLE_KEY>' \
  -H 'Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>' \
  -H 'Content-Type: application/json' \
  -H 'Prefer: return=representation' \
  --data '{"name":"Demo group","created_by":"<AUTH_USER_ID_A>"}'

# Use the group id from the previous response as <GROUP_ID>.
curl -sS -X POST '<SUPABASE_URL>/rest/v1/group_memberships' \
  -H 'apikey: <SUPABASE_SERVICE_ROLE_KEY>' \
  -H 'Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>' \
  -H 'Content-Type: application/json' \
  --data '[{"group_id":"<GROUP_ID>","user_id":"<AUTH_USER_ID_A>","role":"member"},{"group_id":"<GROUP_ID>","user_id":"<AUTH_USER_ID_B>","role":"member"}]'
```

Anon-key REST will fail inserts: RLS on these tables is member/own-row only (`supabase/README.md`).

## 3. Preferred API path (sign in, then `POST /v1/groups`)

When the API has `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, `SupabaseGroupsStore` upserts `profiles` for the JWT `sub` and persists the group/membership.

### 3a. Obtain Auth JWTs

Sign in through the Dashboard user, the mobile client, or Auth HTTP. Example password grant (placeholders only):

```bash
curl -sS -X POST '<SUPABASE_URL>/auth/v1/token?grant_type=password' \
  -H 'apikey: <SUPABASE_ANON_KEY>' \
  -H 'Content-Type: application/json' \
  --data '{"email":"<DEMO_EMAIL_A>","password":"<DEMO_PASSWORD_A>"}'
```

Use `access_token` from the JSON as `<ACCESS_TOKEN_A>`. Repeat for user B. These JWTs are **user** session tokens (not the service role). Gather protected routes expect `Authorization: Bearer <JWT>` verified with `SUPABASE_JWT_SECRET` (`apps/api/README.md`).

### 3b. Create the group as user A

```bash
curl -sS -X POST '<API_PUBLIC_URL>/v1/groups' \
  -H 'Authorization: Bearer <ACCESS_TOKEN_A>' \
  -H 'Content-Type: application/json' \
  --data '{"name":"Demo group"}'
```

`201` body includes `id` (`<GROUP_ID>`). Creator A is already a member.

### 3c. Invite and join as user B

```bash
curl -sS -X POST '<API_PUBLIC_URL>/v1/groups/<GROUP_ID>/invites' \
  -H 'Authorization: Bearer <ACCESS_TOKEN_A>'

curl -sS -X POST '<API_PUBLIC_URL>/v1/invites/<INVITE_TOKEN>/join' \
  -H 'Authorization: Bearer <ACCESS_TOKEN_B>'

curl -sS '<API_PUBLIC_URL>/v1/groups/<GROUP_ID>/members' \
  -H 'Authorization: Bearer <ACCESS_TOKEN_A>'
```

Members list should include both Auth UUIDs.

## Safety

- Never commit `.env`, dashboard screenshots of keys, or a dump of `auth.users`.
- Do not put `<SUPABASE_SERVICE_ROLE_KEY>` in mobile, CI logs, or planner env.
- Demo seed is **not** a production fixture. RLS remains Gate 1 stubs; do not treat SQL Editor access as a product API.
- Do not invent extra members, votes, or confirmed events here — those belong to later demo tasks and frozen contracts.
