-- Harden RLS policies for core tables.
-- Apply with: supabase db push (or run in SQL editor).

alter table if exists public.trips enable row level security;
alter table if exists public.contact_messages enable row level security;
alter table if exists public.notifications enable row level security;
alter table if exists public.profiles enable row level security;

-- -----------------------------
-- trips
-- -----------------------------
drop policy if exists "trips_select_own_or_manager" on public.trips;
create policy "trips_select_own_or_manager"
on public.trips
for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        coalesce(p.role, '') in ('admin', 'safety_admin', 'dept_staff')
        or coalesce(p.is_tech_admin, false) = true
      )
  )
);

drop policy if exists "trips_insert_own_only" on public.trips;
create policy "trips_insert_own_only"
on public.trips
for insert
with check (auth.uid() = user_id);

drop policy if exists "trips_update_own_or_manager" on public.trips;
create policy "trips_update_own_or_manager"
on public.trips
for update
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        coalesce(p.role, '') in ('admin', 'safety_admin', 'dept_staff')
        or coalesce(p.is_tech_admin, false) = true
      )
  )
)
with check (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        coalesce(p.role, '') in ('admin', 'safety_admin', 'dept_staff')
        or coalesce(p.is_tech_admin, false) = true
      )
  )
);

drop policy if exists "trips_delete_own_draft_only" on public.trips;
create policy "trips_delete_own_draft_only"
on public.trips
for delete
using (auth.uid() = user_id and coalesce(status, '') = 'draft');

-- -----------------------------
-- contact_messages
-- -----------------------------
drop policy if exists "contact_messages_select_own_or_manager" on public.contact_messages;
create policy "contact_messages_select_own_or_manager"
on public.contact_messages
for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        coalesce(p.role, '') in ('admin', 'safety_admin', 'dept_staff')
        or coalesce(p.is_tech_admin, false) = true
      )
  )
);

drop policy if exists "contact_messages_insert_own_only" on public.contact_messages;
create policy "contact_messages_insert_own_only"
on public.contact_messages
for insert
with check (auth.uid() = user_id);

drop policy if exists "contact_messages_update_manager_only" on public.contact_messages;
create policy "contact_messages_update_manager_only"
on public.contact_messages
for update
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        coalesce(p.role, '') in ('admin', 'safety_admin', 'dept_staff')
        or coalesce(p.is_tech_admin, false) = true
      )
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        coalesce(p.role, '') in ('admin', 'safety_admin', 'dept_staff')
        or coalesce(p.is_tech_admin, false) = true
      )
  )
);

-- -----------------------------
-- notifications
-- -----------------------------
drop policy if exists "notifications_select_own_only" on public.notifications;
create policy "notifications_select_own_only"
on public.notifications
for select
using (auth.uid() = user_id);

drop policy if exists "notifications_update_own_only" on public.notifications;
create policy "notifications_update_own_only"
on public.notifications
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- -----------------------------
-- profiles
-- -----------------------------
drop policy if exists "profiles_select_own_or_manager" on public.profiles;
create policy "profiles_select_own_or_manager"
on public.profiles
for select
using (
  auth.uid() = id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        coalesce(p.role, '') in ('admin', 'safety_admin', 'dept_staff')
        or coalesce(p.is_tech_admin, false) = true
      )
  )
);

drop policy if exists "profiles_upsert_own_only" on public.profiles;
create policy "profiles_upsert_own_only"
on public.profiles
for all
using (auth.uid() = id)
with check (auth.uid() = id);
