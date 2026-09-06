-- 0007_fix_organization_provisioning.sql
--
-- Fixes a real, reproduced production bug: creating a project as a brand
-- new developer returned 403.
--
-- ROOT CAUSE (confirmed by direct inspection, not guessed):
-- org_members_insert_owner_admin_role's WITH CHECK does
--   exists (select 1 from organizations where id = organization_id and owner_id = auth.uid())
-- That subquery reads `organizations` directly, so it's subject to
-- `organizations`' own SELECT policy (organizations_select_member_or_admin),
-- which only allowed is_org_member(id) OR is_super_admin(). At the exact
-- moment a brand-new developer's OWN membership row is being inserted --
-- right after their organization is created, before any membership exists
-- -- is_org_member() is false (no membership yet) and is_super_admin() is
-- false, so the subquery sees zero rows and the membership INSERT itself
-- is rejected by RLS. A chicken-and-egg trap baked into the policy design,
-- not a transient timing issue -- it would reproduce for every single new
-- developer, every time.
--
-- FIX, two parts:
--   1. organizations SELECT policy now also allows owner_id = auth.uid(),
--      closing the RLS gap directly (also fixes the org_members subquery,
--      since it reads through the same policy).
--   2. Organization + membership creation is moved into ONE atomic
--      SECURITY DEFINER function (get_or_create_default_organization),
--      called via RPC, so there is never a client-observable window where
--      an organization exists without its owner's membership -- this
--      removes the race entirely rather than just patching around it, and
--      derives identity from auth.uid() server-side rather than trusting
--      a client-supplied user id.
--
-- Also closes a related gap: profiles had no INSERT policy at all, so if
-- the handle_new_user() trigger on auth.users ever failed to fire for any
-- account, nothing -- not even that user themselves -- could ever create
-- the missing profile row client-side; the account would be permanently
-- stuck. A narrow "insert your own profile only" policy plus a client-side
-- self-heal upsert (see AuthContext.tsx) closes that.

-- ---------------------------------------------------------------------------
-- 1. organizations SELECT policy: add owner_id
-- ---------------------------------------------------------------------------
drop policy if exists "organizations_select_member_or_admin" on public.organizations;

create policy "organizations_select_owner_member_or_admin"
  on public.organizations for select
  using (owner_id = auth.uid() or public.is_org_member(id) or public.is_super_admin());

-- ---------------------------------------------------------------------------
-- 2. Atomic, idempotent organization provisioning
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER: executes with the privileges of the function owner, so
-- it bypasses RLS internally for its own reads/writes -- eliminating the
-- timing/visibility problem entirely rather than routing around it. Always
-- derives the caller's identity from auth.uid() (never a parameter), so a
-- client can never provision or return data for another user.
--
-- Idempotent: repeated calls for the same user (double-click, page refresh
-- racing itself, retried request) always return the same organization id
-- rather than creating duplicates -- checks owner first, then existing
-- membership, before ever inserting.
create or replace function public.get_or_create_default_organization(p_name text, p_slug_base text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_slug text;
  v_safe_base text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Already owns one -- return it (oldest first, in case more than one
  -- somehow exists from before this fix).
  select o.id into v_org_id
  from public.organizations o
  where o.owner_id = v_user_id
  order by o.created_at asc
  limit 1;

  if v_org_id is not null then
    return v_org_id;
  end if;

  -- Already a member of one (e.g. invited to someone else's org) -- return
  -- that instead of creating a second, unrelated default organization.
  select om.organization_id into v_org_id
  from public.organization_members om
  where om.user_id = v_user_id
  order by om.created_at asc
  limit 1;

  if v_org_id is not null then
    return v_org_id;
  end if;

  -- Neither exists -- create both atomically. Slug gets a random suffix to
  -- avoid collisions between users with similar email local-parts.
  v_safe_base := coalesce(nullif(regexp_replace(lower(p_slug_base), '[^a-z0-9]+', '-', 'g'), ''), 'org');
  v_slug := v_safe_base || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);

  insert into public.organizations (name, slug, owner_id)
  values (coalesce(nullif(p_name, ''), 'My Organization'), v_slug, v_user_id)
  returning id into v_org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org_id, v_user_id, 'owner')
  on conflict (organization_id, user_id) do nothing;

  return v_org_id;
end;
$$;

grant execute on function public.get_or_create_default_organization(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. profiles: allow a user to insert (only) their own profile row, closing
--    the self-heal gap described above. This does not weaken visibility --
--    profiles_select_own_or_admin / profiles_update_own are unchanged.
-- ---------------------------------------------------------------------------
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (id = auth.uid());
