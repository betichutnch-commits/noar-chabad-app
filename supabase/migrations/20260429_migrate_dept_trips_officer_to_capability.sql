-- Migrate legacy dept_trips_officer role into dept_staff + capability flag.
-- This migration is idempotent and safe to re-run.

-- 1) auth.users metadata migration
update auth.users
set raw_user_meta_data = jsonb_set(
  jsonb_set(
    coalesce(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"dept_staff"'::jsonb,
    true
  ),
  '{can_dept_review}',
  'true'::jsonb,
  true
)
where coalesce(raw_user_meta_data ->> 'role', '') = 'dept_trips_officer';

-- 2) profiles role migration (source-of-truth role in app queries)
update public.profiles
set role = 'dept_staff'
where role = 'dept_trips_officer';
