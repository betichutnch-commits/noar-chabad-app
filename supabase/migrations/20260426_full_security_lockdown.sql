-- Full security lockdown for core app data + storage.
-- Safe to re-run (idempotent policy drops/creates).
--
-- Covers:
-- 1) RLS enablement
-- 2) Helper function for manager authorization
-- 3) Public schema policies: trips, profiles, contact_messages, notifications
-- 4) Storage policies: trip-files, avatars
--
-- IMPORTANT:
-- - Run as project owner/admin in Supabase SQL Editor.
-- - Review bucket names before applying.

begin;

-- =========================================================
-- 0) Helper authorization function
-- =========================================================
create or replace function public.is_manager_actor(actor_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = actor_id
      and (
        coalesce(p.role, '') in ('admin', 'safety_admin', 'dept_staff')
        or coalesce(p.is_tech_admin, false) = true
      )
  );
$$;

-- =========================================================
-- 1) Enable RLS on core tables
-- =========================================================
alter table if exists public.trips enable row level security;
alter table if exists public.profiles enable row level security;
alter table if exists public.contact_messages enable row level security;
alter table if exists public.notifications enable row level security;
-- NOTE:
-- We intentionally do not run:
--   alter table storage.objects enable row level security;
-- because some Supabase roles are not owners of storage.objects.
-- Storage RLS is typically already enabled by Supabase.

-- =========================================================
-- 2) trips policies
-- =========================================================
drop policy if exists "trips_select_own_or_manager" on public.trips;
create policy "trips_select_own_or_manager"
on public.trips
for select
to authenticated
using (
  auth.uid() = user_id
  or public.is_manager_actor(auth.uid())
);

drop policy if exists "trips_insert_own_only" on public.trips;
create policy "trips_insert_own_only"
on public.trips
for insert
to authenticated
with check (
  auth.uid() = user_id
);

drop policy if exists "trips_update_own_or_manager" on public.trips;
create policy "trips_update_own_or_manager"
on public.trips
for update
to authenticated
using (
  auth.uid() = user_id
  or public.is_manager_actor(auth.uid())
)
with check (
  auth.uid() = user_id
  or public.is_manager_actor(auth.uid())
);

drop policy if exists "trips_delete_own_draft_only" on public.trips;
create policy "trips_delete_own_draft_only"
on public.trips
for delete
to authenticated
using (
  auth.uid() = user_id
  and coalesce(status, '') = 'draft'
);

-- =========================================================
-- 3) profiles policies
-- =========================================================
drop policy if exists "profiles_select_own_or_manager" on public.profiles;
create policy "profiles_select_own_or_manager"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or public.is_manager_actor(auth.uid())
);

drop policy if exists "profiles_insert_own_only" on public.profiles;
create policy "profiles_insert_own_only"
on public.profiles
for insert
to authenticated
with check (
  auth.uid() = id
);

drop policy if exists "profiles_update_own_only" on public.profiles;
create policy "profiles_update_own_only"
on public.profiles
for update
to authenticated
using (
  auth.uid() = id
)
with check (
  auth.uid() = id
);

drop policy if exists "profiles_delete_denied" on public.profiles;
create policy "profiles_delete_denied"
on public.profiles
for delete
to authenticated
using (false);

-- =========================================================
-- 4) contact_messages policies
-- =========================================================
drop policy if exists "contact_messages_select_own_or_manager" on public.contact_messages;
create policy "contact_messages_select_own_or_manager"
on public.contact_messages
for select
to authenticated
using (
  auth.uid() = user_id
  or public.is_manager_actor(auth.uid())
);

drop policy if exists "contact_messages_insert_own_only" on public.contact_messages;
create policy "contact_messages_insert_own_only"
on public.contact_messages
for insert
to authenticated
with check (
  auth.uid() = user_id
);

drop policy if exists "contact_messages_update_manager_only" on public.contact_messages;
create policy "contact_messages_update_manager_only"
on public.contact_messages
for update
to authenticated
using (
  public.is_manager_actor(auth.uid())
)
with check (
  public.is_manager_actor(auth.uid())
);

drop policy if exists "contact_messages_delete_denied" on public.contact_messages;
create policy "contact_messages_delete_denied"
on public.contact_messages
for delete
to authenticated
using (false);

-- =========================================================
-- 5) notifications policies
-- =========================================================
drop policy if exists "notifications_select_own_only" on public.notifications;
create policy "notifications_select_own_only"
on public.notifications
for select
to authenticated
using (
  auth.uid() = user_id
);

drop policy if exists "notifications_insert_own_or_manager" on public.notifications;
create policy "notifications_insert_own_or_manager"
on public.notifications
for insert
to authenticated
with check (
  auth.uid() = user_id
  or public.is_manager_actor(auth.uid())
);

drop policy if exists "notifications_update_own_or_manager" on public.notifications;
create policy "notifications_update_own_or_manager"
on public.notifications
for update
to authenticated
using (
  auth.uid() = user_id
  or public.is_manager_actor(auth.uid())
)
with check (
  auth.uid() = user_id
  or public.is_manager_actor(auth.uid())
);

drop policy if exists "notifications_delete_denied" on public.notifications;
create policy "notifications_delete_denied"
on public.notifications
for delete
to authenticated
using (false);

-- =========================================================
-- 6) storage.objects policies (guarded)
-- Buckets assumed by app:
--   - trip-files (private)
--   - avatars (public bucket content; writes owner-scoped)
--
-- Some roles cannot alter policies on storage.objects due ownership.
-- We guard this block so public-table hardening still succeeds.
-- =========================================================
do $$
begin
  -- ---------- trip-files ----------
  execute 'drop policy if exists "trip_files_select_owner_or_manager" on storage.objects';
  execute $sql$
    create policy "trip_files_select_owner_or_manager"
    on storage.objects
    for select
    to authenticated
    using (
      bucket_id = 'trip-files'
      and (
        (storage.foldername(name))[1] = auth.uid()::text
        or public.is_manager_actor(auth.uid())
      )
    )
  $sql$;

  execute 'drop policy if exists "trip_files_insert_owner_only" on storage.objects';
  execute $sql$
    create policy "trip_files_insert_owner_only"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'trip-files'
      and (storage.foldername(name))[1] = auth.uid()::text
    )
  $sql$;

  execute 'drop policy if exists "trip_files_update_owner_or_manager" on storage.objects';
  execute $sql$
    create policy "trip_files_update_owner_or_manager"
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id = 'trip-files'
      and (
        (storage.foldername(name))[1] = auth.uid()::text
        or public.is_manager_actor(auth.uid())
      )
    )
    with check (
      bucket_id = 'trip-files'
      and (
        (storage.foldername(name))[1] = auth.uid()::text
        or public.is_manager_actor(auth.uid())
      )
    )
  $sql$;

  execute 'drop policy if exists "trip_files_delete_owner_or_manager" on storage.objects';
  execute $sql$
    create policy "trip_files_delete_owner_or_manager"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'trip-files'
      and (
        (storage.foldername(name))[1] = auth.uid()::text
        or public.is_manager_actor(auth.uid())
      )
    )
  $sql$;

  -- ---------- avatars ----------
  execute 'drop policy if exists "avatars_select_public" on storage.objects';
  execute $sql$
    create policy "avatars_select_public"
    on storage.objects
    for select
    to public
    using (bucket_id = 'avatars')
  $sql$;

  execute 'drop policy if exists "avatars_insert_owner_prefix_only" on storage.objects';
  execute $sql$
    create policy "avatars_insert_owner_prefix_only"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'avatars'
      and split_part(name, '_', 1) = auth.uid()::text
    )
  $sql$;

  execute 'drop policy if exists "avatars_update_owner_or_manager" on storage.objects';
  execute $sql$
    create policy "avatars_update_owner_or_manager"
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id = 'avatars'
      and (
        split_part(name, '_', 1) = auth.uid()::text
        or public.is_manager_actor(auth.uid())
      )
    )
    with check (
      bucket_id = 'avatars'
      and (
        split_part(name, '_', 1) = auth.uid()::text
        or public.is_manager_actor(auth.uid())
      )
    )
  $sql$;

  execute 'drop policy if exists "avatars_delete_owner_or_manager" on storage.objects';
  execute $sql$
    create policy "avatars_delete_owner_or_manager"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'avatars'
      and (
        split_part(name, '_', 1) = auth.uid()::text
        or public.is_manager_actor(auth.uid())
      )
    )
  $sql$;
exception
  when insufficient_privilege then
    raise notice 'Skipping storage.objects policies due insufficient privilege (must be table owner)';
end;
$$;

commit;
