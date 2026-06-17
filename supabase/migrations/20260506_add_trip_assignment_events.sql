begin;

create table if not exists public.trip_assignment_events (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id) on delete cascade,
  assigned_to uuid null references public.profiles(id) on delete set null,
  assigned_from uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists trip_assignment_events_trip_created_idx
  on public.trip_assignment_events (trip_id, created_at desc);

alter table public.trip_assignment_events enable row level security;

drop policy if exists "trip_assignment_events_select_manager_only" on public.trip_assignment_events;
create policy "trip_assignment_events_select_manager_only"
on public.trip_assignment_events
for select
to authenticated
using (
  public.is_manager_actor(auth.uid())
);

drop policy if exists "trip_assignment_events_insert_manager_only" on public.trip_assignment_events;
create policy "trip_assignment_events_insert_manager_only"
on public.trip_assignment_events
for insert
to authenticated
with check (
  public.is_manager_actor(auth.uid())
);

drop policy if exists "trip_assignment_events_update_denied" on public.trip_assignment_events;
create policy "trip_assignment_events_update_denied"
on public.trip_assignment_events
for update
to authenticated
using (false)
with check (false);

drop policy if exists "trip_assignment_events_delete_denied" on public.trip_assignment_events;
create policy "trip_assignment_events_delete_denied"
on public.trip_assignment_events
for delete
to authenticated
using (false);

commit;

