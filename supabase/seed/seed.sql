-- seed.sql
-- Safe, non-sensitive baseline data. Run with: supabase db reset (applies seed automatically)
-- or: psql -f supabase/seed/seed.sql

insert into public.status_components (name, status) values
  ('API', 'operational'),
  ('Dashboard', 'operational'),
  ('Authentication', 'operational'),
  ('OTP', 'operational'),
  ('Webhooks', 'operational'),
  ('Documentation', 'operational')
on conflict (name) do nothing;
