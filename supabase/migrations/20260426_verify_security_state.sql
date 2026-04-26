-- Security verification script
-- Read-only checks for RLS/policies/buckets/functions.

-- =========================================================
-- 1) RLS status on core tables
-- =========================================================
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('trips', 'profiles', 'contact_messages', 'notifications')
order by c.relname;

-- =========================================================
-- 2) Helper function exists
-- =========================================================
select
  n.nspname as schema_name,
  p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'is_manager_actor';

-- =========================================================
-- 3) Policies on public tables
-- =========================================================
select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  permissive,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('trips', 'profiles', 'contact_messages', 'notifications')
order by tablename, cmd, policyname;

-- =========================================================
-- 4) Expected public policies missing?
-- =========================================================
with expected(policyname) as (
  values
    ('trips_select_own_or_manager'),
    ('trips_insert_own_only'),
    ('trips_update_own_or_manager'),
    ('trips_delete_own_draft_only'),
    ('profiles_select_own_or_manager'),
    ('profiles_insert_own_only'),
    ('profiles_update_own_only'),
    ('profiles_delete_denied'),
    ('contact_messages_select_own_or_manager'),
    ('contact_messages_insert_own_only'),
    ('contact_messages_update_manager_only'),
    ('contact_messages_delete_denied'),
    ('notifications_select_own_only'),
    ('notifications_insert_own_or_manager'),
    ('notifications_update_own_or_manager'),
    ('notifications_delete_denied')
)
select e.policyname as missing_policy
from expected e
left join pg_policies p
  on p.schemaname = 'public'
 and p.policyname = e.policyname
where p.policyname is null
order by e.policyname;

-- =========================================================
-- 5) Buckets state
-- =========================================================
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id in ('trip-files', 'avatars')
order by id;

-- =========================================================
-- 6) Storage policies currently present
-- =========================================================
select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  permissive,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by policyname;

-- =========================================================
-- 7) Expected storage policies missing?
-- (If you skipped storage due privilege, these may appear missing)
-- =========================================================
with expected(policyname) as (
  values
    ('trip_files_select_owner_or_manager'),
    ('trip_files_insert_owner_only'),
    ('trip_files_update_owner_or_manager'),
    ('trip_files_delete_owner_or_manager'),
    ('avatars_select_public'),
    ('avatars_insert_owner_prefix_only'),
    ('avatars_update_owner_or_manager'),
    ('avatars_delete_owner_or_manager')
)
select e.policyname as missing_storage_policy
from expected e
left join pg_policies p
  on p.schemaname = 'storage'
 and p.tablename = 'objects'
 and p.policyname = e.policyname
where p.policyname is null
order by e.policyname;
