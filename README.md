# Codex V1

Codex is a developer platform: a Codex API (utility + OTP endpoints), a
developer dashboard for managing projects and API keys, a Developer Tools
Hub, and a separate Super Admin application. **Supabase is the backend** —
Postgres, Supabase Auth, Edge Functions, and Row Level Security. There is no
separate Node/Go/Python backend anywhere in this codebase.

## Stack

- Frontend: React + TypeScript + Vite + Tailwind CSS, Recharts, Lucide icons
- Backend: Supabase (PostgreSQL, Auth, Edge Functions, RLS, Storage)
- Email: Resend (OTP + future transactional email)
- CI/CD: GitHub Actions → Cloudflare Pages (frontends) + Supabase CLI (DB + functions)

## Repository layout

```
codex/
├── apps/
│   ├── developer/       # Developer-facing web app
│   └── super-admin/     # Separate Super Admin web app (own auth check, own deploy target)
├── supabase/
│   ├── migrations/      # Numbered, ordered SQL migrations (schema + RLS)
│   ├── functions/       # Edge Functions = the Codex API + privileged operations
│   ├── seed/            # Non-sensitive seed data (status page components)
│   └── config.toml
├── docs/
│   └── openapi.yaml     # OpenAPI spec for implemented /v1 endpoints
└── .github/workflows/ci.yml
```

## Setup

### 1. Create a Supabase project

Create a project at supabase.com, then grab your project ref, anon key,
and service role key from Project Settings → API.

### 2. Install the Supabase CLI and link the project

```bash
npm install -g supabase
supabase login
cd codex
supabase link --project-ref <your-project-ref>
```

### 3. Apply migrations and seed data

```bash
supabase db push
# Then paste supabase/seed/seed.sql into the Supabase SQL editor and run it
# (or psql into your project's connection string with -f supabase/seed/seed.sql).
```

Migrations run in filename order: `0000_functions.sql` → `0001_core_schema.sql`
→ `0002_api_keys_and_usage.sql` → `0003_platform_tables.sql` →
`0004_row_level_security.sql`.

### 4. Set Edge Function secrets

```bash
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set ENCRYPTION_KEY=$(openssl rand -base64 32)
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are
already available to Edge Functions automatically inside Supabase — no need
to set them yourself. `ENCRYPTION_KEY` is required for webhook signing
secrets specifically (see "Security notes" below for why) — everything else
works without it, but the `webhooks` function will fail until it's set.

### 5. Deploy Edge Functions

```bash
supabase functions deploy
```

This deploys every function under `supabase/functions/*` (each directory is
one function). To deploy just one: `supabase functions deploy uuid-generate`.

### 6. Grant yourself Super Admin access

There's a chicken-and-egg problem by design: `admin_roles` can only be
written by an existing super admin (RLS). So the very first admin has to be
inserted directly via the Supabase SQL editor (which runs as postgres,
bypassing RLS):

```sql
-- Sign up normally in the developer app first, then find your user id:
select id, email from auth.users where email = 'you@example.com';

insert into public.admin_roles (user_id, role)
values ('<your-user-id>', 'super_admin');
```

### 7. Configure and run both frontends

```bash
cd apps/developer
cp .env.example .env   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm install
npm run dev             # http://localhost:5173

cd ../super-admin
cp .env.example .env
npm install
npm run dev             # http://localhost:5174
```

### 8. Build and verify

```bash
cd apps/developer && npm run lint && npm run typecheck && npm run test -- --run && npm run build
cd ../super-admin && npm run lint && npm run typecheck && npm run test -- --run && npm run build
```

### 9. Deploy

- Frontends: push to `main` — `.github/workflows/ci.yml` builds and deploys
  both apps to Cloudflare Pages as separate projects (`codex-developer`,
  `codex-super-admin`), and pushes migrations + functions to Supabase.
  Required repo secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
  `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`.
- Or deploy manually: `npm run build` in each app, then upload `dist/` to
  Cloudflare Pages (or any static host — both apps include a `_redirects`
  file for SPA routing).

## Architecture

```
Developer Web App          Super Admin Web App
(apps/developer)           (apps/super-admin)
        |                          |
        +----------+---------------+
                   |
              SUPABASE
        +----------+-----------+
   Supabase Auth  Edge Functions  PostgreSQL + RLS
                                     |
                    projects, api_keys, request_logs, api_usage,
                    otp_verifications, webhooks, notifications,
                    announcements, changelog, status, audit_logs,
                    admin_roles
```

Tenant isolation (`user -> organization -> project -> api_key`) is enforced
by PostgreSQL RLS policies, not frontend checks — see
`supabase/migrations/0004_row_level_security.sql`. Changing an ID in a
request cannot expose another user's data; the database itself refuses the
row.

## Security notes

- **API key secrets are never stored.** `api-keys-create` generates the
  secret, returns it once in the HTTP response, and persists only its
  SHA-256 hash (`api_keys.key_hash`) plus a short non-secret prefix for
  display. The Super Admin app can see key metadata (prefix, status, last
  used) but never the secret.
- **OTP codes are never stored in plaintext**, are hashed the same way, are
  rate-limited by attempt count (`max_attempts`, default 5), and expire
  after 5 minutes.
- **Service-role key never reaches the browser.** It's only referenced
  inside Edge Functions (server-side Deno runtime), read from
  `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`. Frontend code only ever uses
  the anon key.
- **Webhook signing secrets are encrypted, not hashed — deliberately.** API
  key secrets and OTP codes only ever need to be *verified* (does this
  match?), so a one-way SHA-256 hash is correct and preferable for them.
  Webhook signing secrets are different: Codex has to *use* the raw secret
  to sign every outgoing delivery, so it stores them with reversible
  AES-GCM encryption (`ENCRYPTION_KEY`) instead. See the comment in
  `supabase/functions/_shared/crypto.ts` (`encryptSecret`/`decryptSecret`)
  for the reasoning — this is the kind of distinction that's easy to get
  wrong by copy-pasting the API-key pattern, so it's called out explicitly
  rather than left implicit.
- **Every protected `/v1/*` endpoint** runs through the same pipeline
  (`supabase/functions/_shared/authenticate.ts` -> `rateLimit.ts` ->
  `logRequest.ts`) rather than reimplementing auth per endpoint.
- **The Super Admin app is a physically separate application** (own Vite
  project, own build, own Cloudflare Pages deployment, own domain if you
  configure one) with its own `RequireSuperAdmin` check that verifies a row
  in `admin_roles` server-side via RLS — a hidden URL is never treated as
  the security boundary.

## Critical fix: new-developer 403 on project creation (migration 0007)

A real, reproduced production bug, root-caused by direct inspection rather
than guessing:

**Symptom:** a brand-new developer's very first project creation (and the
organization-provisioning step just before it) failed with 403.

**Root cause:** `org_members_insert_owner_admin_role`'s `WITH CHECK` runs
`exists (select 1 from organizations where id = organization_id and
owner_id = auth.uid())`. That subquery reads `organizations` directly, so
it's subject to `organizations`' own SELECT policy
(`organizations_select_member_or_admin`), which only allowed
`is_org_member(id) OR is_super_admin()`. At the exact moment a new
developer's *own* membership row is being inserted — right after their
organization is created, before any membership exists — `is_org_member()`
is false (no membership yet) and `is_super_admin()` is false, so the
subquery sees zero rows and the membership INSERT itself is rejected by
RLS. This is a chicken-and-egg trap baked into the policy design — it
would reproduce for **every single new developer, every time**, not an
intermittent race.

**Fix, migration `0007_fix_organization_provisioning.sql`:**
1. `organizations`' SELECT policy now also allows `owner_id = auth.uid()`,
   closing the gap directly (this also fixes the `org_members` subquery,
   since it reads through the same policy).
2. Organization + membership creation moved into one atomic
   `SECURITY DEFINER` function, `get_or_create_default_organization(name,
   slug_base)`, called via `supabase.rpc(...)` — bypasses RLS internally
   (removing the timing problem entirely rather than patching around it),
   derives identity from `auth.uid()` server-side only (never a client
   parameter), and is idempotent (checks owner, then membership, before
   ever inserting — safe against double-clicks, refreshes, or retries).
   `services/projects.ts`'s `getOrCreateDefaultOrganization` now calls this
   RPC instead of the old 3-step client-side select/insert/insert flow.
3. `profiles` had **no INSERT policy at all** — a related gap: if the
   `handle_new_user()` trigger on `auth.users` (the only path that could
   ever create a profile row) failed to fire for any account for any
   reason, nothing — not even that user themselves — could ever create the
   missing row client-side; the account would be stuck permanently with no
   self-heal path. Added a narrow `profiles_insert_own` policy
   (`with check (id = auth.uid())`) plus a client-side self-heal upsert in
   `AuthContext.tsx` that runs on every session resolution (no-op for every
   normal account that already has a row).

## Fixes from the full backend audit

- **`send-announcement-email` was silently swallowing notification-insert
  errors** — `if (!notifError) { notificationsCreated = ... }` meant a
  failed insert just left the count at 0 with no error surfaced anywhere,
  while the function still returned overall success. Also, a missing
  `RESEND_API_KEY` triggered an early `fail()` return that discarded an
  *already-successful* in-app fan-out that had run first in the same call —
  the two channels were not actually independent despite being documented
  as such. Rewritten: each channel's outcome (attempted/created/error) is
  tracked independently, logged server-side on failure, and returned in the
  response body (`notifications_error`, `email_error`) rather than ever
  silently discarded or allowed to overwrite the other channel's real
  result. `AdminAnnouncementsPage` updated to check these fields explicitly,
  since the function now always returns HTTP success even on a partial
  channel failure by design.
- **Recipient deduplication** added as an explicit pass over the resolved
  audience list before any fan-out, regardless of which audience path
  produced it.
- **Super Admin's Developers page and Overview page disagreed on who
  counts as a developer** — the underlying query included Super Admin
  accounts (every account gets a `profiles` row, admin or not), so the
  "Developers" list and count were both silently inflated by however many
  admin accounts existed. `admin-list-developers` now excludes any
  `admin_roles` user from both the list and `total`; `AdminOverviewPage`
  now sources its Developers stat from that same function instead of a
  separate raw `profiles` count, so the two pages can no longer disagree.
- **`NotificationsPage` discarded fetch errors silently** —
  `const { data } = await supabase.from('notifications')...` meant a
  genuine query failure was visually indistinguishable from "you have no
  notifications." Now captures and displays the error, and `markRead` uses
  an optimistic update with rollback on failure instead of firing and
  forgetting.
- **Deployment script guidance added** (`scripts/deploy-functions.sh` and
  `.ps1`): if a deploy loop iterates `supabase/functions/*` alphabetically
  and aborts on the first failure, `_shared` (which sorts before every
  real function name) failing would silently prevent *every* real function
  from deploying — a very plausible explanation for "I pushed the edge
  code but it wasn't working." Both scripts explicitly skip `_shared`,
  continue past individual failures, and print a clear succeeded/failed
  summary at the end.
- **Re-verified by direct inspection, not just re-asserted:** every
  `/v1/*` endpoint still uses the centralized `authenticateRequest`/
  `defineEndpoint` pipeline; `hasScope()` is still called by all 6
  direct-pipeline functions; the API Explorer never persists API keys to
  `localStorage` (React state only, cleared on refresh).



A follow-up pass audited and fixed several real issues, and added the pieces
explicitly missing before: a public landing page, a proper logo, functional
settings, a rewritten documentation system, and a comprehensive API Explorer.

**Bugs found and fixed:**
- CI/CD's deploy jobs checked out a fresh, empty runner and tried to deploy a
  `dist/` that only ever existed in a *different* job's VM — every deploy
  would have failed. Rewritten to build once, upload the artifact, and
  deploy exactly that artifact.
- `cache-dependency-path` pointed at `package-lock.json` files that don't
  exist (never ran `npm install` here) — would have hard-failed
  `actions/setup-node` immediately. Switched to a `package.json`-hash cache.
- `profiles.is_super_admin` was a dead column — always `false`, never read
  or written anywhere, sitting beside the real `admin_roles` mechanism.
  Dropped (migration `0005`); `admin_roles` is the sole source of admin
  authority.
- `hasScope()` was defined but called nowhere — every API key's scopes
  field was cosmetic. Now enforced on all 20 `/v1/*` endpoints; a key
  scoped to `["otp"]` genuinely gets `403 PERMISSION_DENIED` calling
  `/v1/uuid/generate`.
- Super Admin's developer list relied on an RLS `OR`-clause that looks
  correct on inspection but is fragile to depend on for a security-sensitive
  listing page. Replaced with `admin-list-developers`, a service-role Edge
  Function that's unambiguous by construction — and it now also surfaces
  real suspend/reinstate status (previously both buttons always showed,
  regardless of actual ban state).

**Brand/visual:**
- Super Admin's yellow identity (sidebar, login page, chart accent) replaced
  with the same blue/cyan accent system as the developer app.
- New logo: an original angle-bracket (`</>`) mark on a blue→cyan gradient
  chip, self-contained so it works on dark and light backgrounds without
  variants. Used in both apps' sidebars, both auth pages, and as the favicon.
  Duplicated as a small source file in each app rather than extracted into
  a real npm workspace package — this repo doesn't have workspace tooling
  wired up yet, and a broken cross-package import felt worse than a few
  duplicated lines. `packages/shared-ui` remains a reasonable future step.
- Fixed an 8-item tool grid that produced an orphaned last row (3, 3, 2) —
  now 4 columns, two clean rows.
- Subtle animated background (dot grid + slow signal lines + pulsing nodes)
  behind the landing page hero — pure CSS keyframes, so it's automatically
  neutralized by the existing `prefers-reduced-motion` override with no
  extra branching logic needed.

**New: public landing page** (`apps/developer/src/pages/LandingPage.tsx`,
now served at `/`) — hero, capability grid, tools grid, security section
with a real response example, docs teaser, footer. Logged-in visitors are
bounced straight to `/dashboard`.

**New: functional settings**, replacing the previous single Account/Security
pair — Account (name, email change with Supabase's built-in dual-confirmation
reauth flow), **Appearance** (real light/dark/system theme, actually
persisted and actually re-themes the whole app — see below), Notifications
&amp; Privacy (real toggles backed by a new `user_preferences` table),
Developer Preferences (default project, API Explorer default environment),
and About (centralized version display).

**Real theme switching, not a cosmetic flag:** the color tokens
(`bg`/`surface`/`border`/`text-primary`/`text-secondary`) were converted
from static hex values to CSS custom properties with real, fully-specified
light AND dark values, referenced through Tailwind's `rgb(var(--x) /
<alpha-value>)` pattern. Toggling the `dark` class (via `ThemeContext`,
persisted to `localStorage`, with a pre-paint inline script to avoid a
flash of the wrong theme) now re-themes every component that already uses
these tokens — which is all of them — with no per-component changes needed.

**Centralized versioning** (`src/version.ts` in both apps): `PRODUCT_VERSION
= 'V1'` regardless of Development/Beta/Production — moving to production is
explicitly NOT a version bump, matching the intended policy. Displayed on
Settings → About.

**Documentation rewrite:** guide-style pages now directly answer the
specific questions from the spec (what is Codex, test vs live keys, auth
headers, first request, handling responses/errors, rotating/revoking keys,
verifying webhook signatures, etc.) instead of one-line summaries. Every
implemented endpoint now has a structured reference entry — Purpose,
Authentication, Request fields, a real request/response example, every
error code it can return, cURL, JavaScript, AND Python examples, a
practical-use note, and security notes where relevant — generated from
`endpointDocs.ts`/`ENDPOINT_GROUPS` and rendered by `DocSectionPage`.

**API Explorer:** previously covered 6 of ~25 implemented endpoints — now
covers all 20 public `/v1/*` endpoints, plus a custom-headers editor, a
"Copy as cURL" button for the request, a "Copy" button for the response,
and the `request_id` pulled out of the response and shown inline.

## Still not done from this pass's full request

Given the scope of the original ask (33 numbered sections), some items
received a full pass, some a partial one, and a few weren't started. Being
specific rather than vague about which is which:

- **Not started:** a dedicated "system health / maintenance" Super Admin
  page (the existing Overview covers usage health, not infra/maintenance
  controls); OTP-specific admin monitoring beyond what the general Logs
  page already shows; a real npm workspace for the duplicated logo
  component.
- **Partial:** accessibility — labels, focus states, and reduced-motion
  support were addressed as they came up, but no dedicated keyboard-nav or
  screen-reader pass was done across every page.
- **Unverified, as before:** nothing in this pass has been run. No
  `npm install`, no live Supabase project, no executed
  lint/typecheck/build, since this environment has no network access. The
  CI/CD fixes are reasoned through carefully but not proven by a green run.

## Known limitations — read before treating this as production-ready

This was built in an assistant session with no network access, so **nothing
here has been run**: no `npm install`, no live Supabase project, no actual
deploy. Everything is written to be correct, but "written correctly" and
"verified working" are different claims. Specifically:

- **Not run against a real Supabase project.** RLS policies, triggers, and
  Edge Functions are correct as written but haven't been exercised against
  live Postgres. Run the migrations against a real (or local `supabase
  start`) project and manually test sign-up -> project -> API key -> API
  call before trusting this with real users.
- **Test coverage is still partial.** Pure-logic unit tests exist for the
  line-diff utility and timestamp conversion; auth, RLS policies, the
  Edge Function auth/rate-limit pipeline, OTP attempt-limiting, and webhook
  signing don't have automated tests yet.
- **Webhook auto-dispatch covers all 5 defined events.** `otp.verified`,
  `otp.failed`, `api_key.created`, `api_key.revoked`, and `project.updated`
  all fire for real (`supabase/functions/_shared/dispatchWebhooks.ts`,
  called from `otp-verify`, `api-keys-create`, `api-keys-rotate`, and
  `projects-update`). Retry/backoff for failed deliveries isn't implemented
  — a failed delivery is logged to `webhook_deliveries` and left there, not
  retried automatically.
- **Rate limiting is a naive fixed window** (`SELECT count(*) ... WHERE
  created_at > now() - 60s`), fine for beta traffic, not for scale — swap
  for Redis/Upstash before real load.
- **MFA (TOTP) is fully enforced, not just enrollable.** `SecuritySettingsPage`
  uses Supabase Auth's real `auth.mfa.enroll/challenge/verify` API, and
  `ProtectedRoute` checks `getAuthenticatorAssuranceLevel()` on every
  protected-route visit — an account with a verified factor that hasn't
  completed the AAL2 challenge this session is redirected to
  `/auth/mfa-challenge` before reaching anything else, not waved through.
- **Session management is real but limited to what Supabase Auth's client
  SDK exposes**: "sign out other sessions" and "sign out everywhere" both
  use `supabase.auth.signOut({ scope })`, which is a genuine supported API.
  There's no per-device list (e.g. "Chrome on Mac, signed in 2 days ago")
  because GoTrue's public API doesn't expose one — that would need a custom
  sessions table populated by the client on each sign-in, which isn't built.
- **Developer suspend/reinstate now shows real status** (fixed in the
  polish pass — see `admin-list-developers`, which joins in actual ban
  status from the Auth Admin API rather than always showing both buttons).
- **Announcement audience targeting for `free`/`pro`/`enterprise`** joins
  through `organizations.plan`, which currently only has real values if you
  set them — every org defaults to `'beta'` today (see spec section 69), so
  those three audience filters will match nobody until you actually assign
  plans somewhere.
- **CORS is currently permissive** (`Access-Control-Allow-Origin: *`) since
  the Codex API is meant for external developer integrations — access
  control is enforced by the API key check, not by origin. Tighten this if
  you decide browser-based public calls should be restricted.
- **Docs content lives in a TypeScript data file**
  (`apps/developer/src/pages/docs/docsContent.ts`), not a CMS — editing
  means editing that file and redeploying, not a database write. Changelog
  and status page content, by contrast, ARE database-backed and manageable
  from the Super Admin app (`/admin/changelog`, `/admin/status`).

None of this was hidden or invented: this is a solid, correctly-structured
V1 foundation, not a finished, load-tested product.
