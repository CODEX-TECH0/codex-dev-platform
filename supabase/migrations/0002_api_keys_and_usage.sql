-- 0002_api_keys_and_usage.sql
-- API keys are never stored in plaintext. We store:
--   - key_prefix: the human-visible non-secret prefix (e.g. "cx_live_8f2a")
--   - key_hash: SHA-256 hash of the full secret, used to look up/verify at auth time
-- The full secret is generated and returned to the client exactly once at creation
-- time (in the Edge Function), and never persisted anywhere.

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  key_prefix text not null unique,
  key_hash text not null unique,
  environment text not null check (environment in ('test', 'live')),
  scopes text[] not null default array['*'],
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  expires_at timestamptz,
  last_used_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index idx_api_keys_project_id on public.api_keys(project_id);
create index idx_api_keys_key_hash on public.api_keys(key_hash);

-- ---------------------------------------------------------------------------
-- request_logs: one row per API request (metadata only, never secrets/bodies)
-- ---------------------------------------------------------------------------
create table public.request_logs (
  id uuid primary key default gen_random_uuid(),
  request_id text not null unique,
  project_id uuid references public.projects(id) on delete set null,
  api_key_id uuid references public.api_keys(id) on delete set null,
  endpoint text not null,
  method text not null,
  status_code integer not null,
  response_time_ms integer not null,
  environment text not null check (environment in ('test', 'live')),
  error_code text,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index idx_request_logs_project_id on public.request_logs(project_id);
create index idx_request_logs_created_at on public.request_logs(created_at desc);
create index idx_request_logs_api_key_id on public.request_logs(api_key_id);

-- ---------------------------------------------------------------------------
-- api_usage: pre-aggregated per-day rollups for fast dashboard charts
-- ---------------------------------------------------------------------------
create table public.api_usage (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  usage_date date not null,
  environment text not null check (environment in ('test', 'live')),
  endpoint text not null,
  request_count integer not null default 0,
  success_count integer not null default 0,
  error_count integer not null default 0,
  avg_response_time_ms numeric,
  unique (project_id, usage_date, environment, endpoint)
);

create index idx_api_usage_project_date on public.api_usage(project_id, usage_date desc);

-- ---------------------------------------------------------------------------
-- audit_logs: who/what/when/context/result for sensitive actions
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_type text not null default 'user' check (actor_type in ('user', 'admin', 'system')),
  action text not null,
  resource_type text not null,
  resource_id uuid,
  context jsonb,
  result text not null check (result in ('success', 'failure')),
  ip_address inet,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_actor_id on public.audit_logs(actor_id);
create index idx_audit_logs_created_at on public.audit_logs(created_at desc);
