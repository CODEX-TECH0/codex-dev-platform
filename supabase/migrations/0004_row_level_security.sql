-- 0004_row_level_security.sql
-- Enforces tenant isolation at the database layer. Frontend/API checks are
-- defense in depth, never the source of truth.

-- ---------------------------------------------------------------------------
-- Helper: is the current user a super admin?
-- SECURITY DEFINER so it can read admin_roles even though admin_roles itself
-- has RLS enabled (avoids infinite recursion in policies that call this).
-- ---------------------------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_roles where user_id = auth.uid()
  );
$$;

-- Helper: is the current user a member of the given organization?
create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = org_id and user_id = auth.uid()
  );
$$;

-- Helper: organization that owns a given project
create or replace function public.project_org_id(p_project_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select organization_id from public.projects where id = p_project_id;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_super_admin());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;

create policy "organizations_select_member_or_admin"
  on public.organizations for select
  using (public.is_org_member(id) or public.is_super_admin());

create policy "organizations_insert_authenticated"
  on public.organizations for insert
  with check (owner_id = auth.uid());

create policy "organizations_update_owner_or_admin"
  on public.organizations for update
  using (owner_id = auth.uid() or public.is_super_admin());

-- ---------------------------------------------------------------------------
-- organization_members
-- ---------------------------------------------------------------------------
alter table public.organization_members enable row level security;

create policy "org_members_select_own_org_or_admin"
  on public.organization_members for select
  using (public.is_org_member(organization_id) or public.is_super_admin());

create policy "org_members_insert_owner_admin_role"
  on public.organization_members for insert
  with check (
    public.is_super_admin() or
    exists (
      select 1 from public.organizations o
      where o.id = organization_id and o.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
alter table public.projects enable row level security;

create policy "projects_select_org_member_or_admin"
  on public.projects for select
  using (public.is_org_member(organization_id) or public.is_super_admin());

create policy "projects_insert_org_member"
  on public.projects for insert
  with check (public.is_org_member(organization_id) and created_by = auth.uid());

create policy "projects_update_org_member_or_admin"
  on public.projects for update
  using (public.is_org_member(organization_id) or public.is_super_admin());

create policy "projects_delete_org_member_or_admin"
  on public.projects for delete
  using (public.is_org_member(organization_id) or public.is_super_admin());

-- ---------------------------------------------------------------------------
-- api_keys — never exposes key_hash usage beyond row visibility; the secret
-- itself is never stored, so there is nothing to leak via SELECT.
-- ---------------------------------------------------------------------------
alter table public.api_keys enable row level security;

create policy "api_keys_select_project_member_or_admin"
  on public.api_keys for select
  using (public.is_org_member(public.project_org_id(project_id)) or public.is_super_admin());

create policy "api_keys_insert_project_member"
  on public.api_keys for insert
  with check (public.is_org_member(public.project_org_id(project_id)) and created_by = auth.uid());

create policy "api_keys_update_project_member_or_admin"
  on public.api_keys for update
  using (public.is_org_member(public.project_org_id(project_id)) or public.is_super_admin());

-- ---------------------------------------------------------------------------
-- request_logs / api_usage — read-only to members; writes happen only via
-- Edge Functions using the service role key (bypasses RLS by design).
-- ---------------------------------------------------------------------------
alter table public.request_logs enable row level security;

create policy "request_logs_select_project_member_or_admin"
  on public.request_logs for select
  using (public.is_org_member(public.project_org_id(project_id)) or public.is_super_admin());

alter table public.api_usage enable row level security;

create policy "api_usage_select_project_member_or_admin"
  on public.api_usage for select
  using (public.is_org_member(public.project_org_id(project_id)) or public.is_super_admin());

-- ---------------------------------------------------------------------------
-- audit_logs — visible to the actor themselves and admins only
-- ---------------------------------------------------------------------------
alter table public.audit_logs enable row level security;

create policy "audit_logs_select_own_or_admin"
  on public.audit_logs for select
  using (actor_id = auth.uid() or public.is_super_admin());

-- ---------------------------------------------------------------------------
-- otp_verifications — project members can see status metadata; writes via
-- Edge Functions (service role) only, never direct client writes.
-- ---------------------------------------------------------------------------
alter table public.otp_verifications enable row level security;

create policy "otp_select_project_member_or_admin"
  on public.otp_verifications for select
  using (public.is_org_member(public.project_org_id(project_id)) or public.is_super_admin());

-- ---------------------------------------------------------------------------
-- webhooks
-- ---------------------------------------------------------------------------
alter table public.webhooks enable row level security;

create policy "webhooks_select_project_member_or_admin"
  on public.webhooks for select
  using (public.is_org_member(public.project_org_id(project_id)) or public.is_super_admin());

create policy "webhooks_insert_project_member"
  on public.webhooks for insert
  with check (public.is_org_member(public.project_org_id(project_id)) and created_by = auth.uid());

create policy "webhooks_update_project_member_or_admin"
  on public.webhooks for update
  using (public.is_org_member(public.project_org_id(project_id)) or public.is_super_admin());

create policy "webhooks_delete_project_member_or_admin"
  on public.webhooks for delete
  using (public.is_org_member(public.project_org_id(project_id)) or public.is_super_admin());

alter table public.webhook_deliveries enable row level security;

create policy "webhook_deliveries_select_project_member_or_admin"
  on public.webhook_deliveries for select
  using (
    public.is_super_admin() or
    exists (
      select 1 from public.webhooks w
      where w.id = webhook_id and public.is_org_member(public.project_org_id(w.project_id))
    )
  );

-- ---------------------------------------------------------------------------
-- notifications — strictly per-user
-- ---------------------------------------------------------------------------
alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- announcements — readable by everyone (audience filtering happens in the
-- application layer at fetch time); writable only by admins
-- ---------------------------------------------------------------------------
alter table public.announcements enable row level security;

create policy "announcements_select_all_authenticated"
  on public.announcements for select
  using (auth.role() = 'authenticated');

create policy "announcements_write_admin_only"
  on public.announcements for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- changelog / status — public read, admin write
-- ---------------------------------------------------------------------------
alter table public.changelog_entries enable row level security;

create policy "changelog_select_all"
  on public.changelog_entries for select
  using (true);

create policy "changelog_write_admin_only"
  on public.changelog_entries for insert
  with check (public.is_super_admin());

alter table public.status_components enable row level security;

create policy "status_components_select_all"
  on public.status_components for select
  using (true);

create policy "status_components_write_admin_only"
  on public.status_components for update
  using (public.is_super_admin());

alter table public.status_incidents enable row level security;

create policy "status_incidents_select_all"
  on public.status_incidents for select
  using (true);

create policy "status_incidents_write_admin_only"
  on public.status_incidents for insert
  with check (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- admin_roles — only visible/writable by existing super admins
-- ---------------------------------------------------------------------------
alter table public.admin_roles enable row level security;

create policy "admin_roles_select_admin_only"
  on public.admin_roles for select
  using (public.is_super_admin());

create policy "admin_roles_write_admin_only"
  on public.admin_roles for insert
  with check (public.is_super_admin());
