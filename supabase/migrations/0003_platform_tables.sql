-- 0003_platform_tables.sql

-- ---------------------------------------------------------------------------
-- otp_verifications
-- ---------------------------------------------------------------------------
create table public.otp_verifications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  api_key_id uuid references public.api_keys(id) on delete set null,
  recipient text not null, -- email or (future) phone number
  channel text not null default 'email' check (channel in ('email', 'sms', 'totp')),
  code_hash text not null,
  environment text not null check (environment in ('test', 'live')),
  status text not null default 'pending' check (status in ('pending', 'verified', 'expired', 'failed')),
  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_otp_project_id on public.otp_verifications(project_id);
create index idx_otp_expires_at on public.otp_verifications(expires_at);

-- ---------------------------------------------------------------------------
-- webhooks + deliveries
-- ---------------------------------------------------------------------------
create table public.webhooks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  url text not null,
  description text,
  events text[] not null default array[]::text[],
  -- Reversible (AES-GCM, encrypted with ENCRYPTION_KEY), NOT a hash: Codex
  -- must sign every outgoing delivery with the raw secret at send-time, so
  -- unlike api_keys.key_hash / otp code_hash this cannot be one-way.
  signing_secret_encrypted text not null,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  webhook_id uuid not null references public.webhooks(id) on delete cascade,
  event_id text not null,
  event_type text not null,
  status text not null check (status in ('pending', 'delivered', 'failed', 'retrying')),
  response_status_code integer,
  attempt_count integer not null default 0,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_webhook_deliveries_webhook_id on public.webhook_deliveries(webhook_id);

-- ---------------------------------------------------------------------------
-- notifications (in-app, per-user) + announcements (admin broadcast source)
-- ---------------------------------------------------------------------------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  severity text not null default 'info' check (severity in ('info', 'important', 'critical')),
  audience text not null default 'everyone' check (audience in ('everyone', 'free', 'developers', 'pro', 'enterprise', 'specific')),
  audience_user_ids uuid[],
  channels text[] not null default array['in_app'],
  created_by uuid not null references public.profiles(id),
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  announcement_id uuid references public.announcements(id) on delete set null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_id on public.notifications(user_id);

-- ---------------------------------------------------------------------------
-- changelog
-- ---------------------------------------------------------------------------
create table public.changelog_entries (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  title text not null,
  description text not null,
  entry_type text not null check (entry_type in ('feature', 'improvement', 'fix', 'breaking')),
  published_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id)
);

-- ---------------------------------------------------------------------------
-- status page
-- ---------------------------------------------------------------------------
create table public.status_components (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  status text not null default 'operational'
    check (status in ('operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance')),
  updated_at timestamptz not null default now()
);

create table public.status_incidents (
  id uuid primary key default gen_random_uuid(),
  component_id uuid not null references public.status_components(id) on delete cascade,
  title text not null,
  description text,
  status text not null check (status in ('investigating', 'identified', 'monitoring', 'resolved')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- ---------------------------------------------------------------------------
-- admin_roles: explicit, separate from profiles.is_super_admin convenience flag
-- ---------------------------------------------------------------------------
create table public.admin_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  role text not null default 'super_admin' check (role in ('super_admin')),
  granted_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
