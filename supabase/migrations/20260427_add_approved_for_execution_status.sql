-- Adds a dedicated status for execution approval.
-- Safe to run after existing status migrations.

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
      'approved_for_execution',
      'rejected',
      'cancelled'
    )
  );
