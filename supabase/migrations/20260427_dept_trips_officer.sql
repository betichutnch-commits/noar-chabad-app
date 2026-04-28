-- Adds the dept_trips_officer review stage to the trips workflow.
-- Apply with: supabase db push (or run in SQL editor).

-- 1. New audit columns on trips
alter table if exists public.trips
  add column if not exists dept_review_notes text,
  add column if not exists dept_reviewed_by uuid references public.profiles(id),
  add column if not exists dept_reviewed_at timestamptz,
  add column if not exists dept_forwarded_at timestamptz;

-- 2. Drop legacy status check constraint if present, recreate with new values
do $$
declare
  constraint_name text;
begin
  select c.conname into constraint_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  where t.relname = 'trips'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%status%';

  if constraint_name is not null then
    execute format('alter table public.trips drop constraint %I', constraint_name);
  end if;
end$$;

alter table if exists public.trips
  add constraint trips_status_check check (
    coalesce(status, '') in (
      'draft',
      'pending_dept_review',
      'returned_for_changes',
      'pending',
      'approved',
      'rejected',
      'cancelled'
    )
  );

-- 3. RLS: dept_trips_officer may select/update trips in their department
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
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.role, '') = 'dept_trips_officer'
      and coalesce(p.department, '') = coalesce(public.trips.department, '')
  )
);

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
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.role, '') = 'dept_trips_officer'
      and coalesce(p.department, '') = coalesce(public.trips.department, '')
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
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.role, '') = 'dept_trips_officer'
      and coalesce(p.department, '') = coalesce(public.trips.department, '')
  )
);

-- 4. Index to keep officer queries fast (filter by department + status)
create index if not exists trips_department_status_idx
  on public.trips (department, status);
