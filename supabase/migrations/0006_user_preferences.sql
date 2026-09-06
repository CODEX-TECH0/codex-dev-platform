-- 0006_user_preferences.sql
--
-- Backs the Settings > Notifications and Settings > Developer Preferences
-- pages. Theme (light/dark/system) deliberately does NOT live here — it's
-- a pure client-side/device preference (localStorage via ThemeContext), the
-- same way most apps treat display theme; nothing about it needs to be
-- known server-side or sync across devices for V1.

create table public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,

  -- Notifications
  email_product_updates boolean not null default true,
  email_security_alerts boolean not null default true,
  in_app_announcements boolean not null default true,

  -- Privacy
  analytics_opt_in boolean not null default true,

  -- Developer preferences
  default_project_id uuid references public.projects(id) on delete set null,
  api_explorer_default_environment text not null default 'test' check (api_explorer_default_environment in ('test', 'live')),

  updated_at timestamptz not null default now()
);

create trigger set_user_preferences_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

alter table public.user_preferences enable row level security;

create policy "user_preferences_select_own"
  on public.user_preferences for select
  using (user_id = auth.uid());

create policy "user_preferences_upsert_own"
  on public.user_preferences for insert
  with check (user_id = auth.uid());

create policy "user_preferences_update_own"
  on public.user_preferences for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
