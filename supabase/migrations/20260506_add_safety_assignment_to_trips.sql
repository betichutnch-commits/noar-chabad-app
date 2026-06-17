begin;

alter table public.trips
  add column if not exists safety_assignee_id uuid null references public.profiles(id) on delete set null,
  add column if not exists safety_assigned_at timestamptz null,
  add column if not exists safety_assigned_by uuid null references public.profiles(id) on delete set null;

create index if not exists trips_status_assignee_created_idx
  on public.trips (status, safety_assignee_id, created_at desc);

commit;

