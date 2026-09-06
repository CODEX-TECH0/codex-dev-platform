-- 0005_remove_redundant_admin_flag.sql
--
-- profiles.is_super_admin (added in 0001_core_schema.sql) was a second,
-- parallel source of admin authority alongside admin_roles. It was never
-- actually read or written by any Edge Function, RLS policy, or frontend
-- query — every real authorization check (public.is_super_admin(), every
-- admin-only RLS policy, RequireSuperAdmin in the Super Admin app) already
-- goes through admin_roles exclusively. A column that always reads false
-- and silently disagrees with the real admin list is a footgun waiting to
-- mislead whoever eventually does read it, so it's removed here rather than
-- left "just in case." admin_roles is the single, explicit source of truth
-- for Super Admin status going forward.

alter table public.profiles drop column if exists is_super_admin;
