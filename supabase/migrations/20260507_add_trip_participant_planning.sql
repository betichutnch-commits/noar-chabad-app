begin;

create table if not exists public.trip_plan_buses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  capacity integer not null default 50,
  leader_name text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_plan_groups (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  target_size integer not null default 10,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_plan_participant_overrides (
  trip_id uuid not null references public.trips(id) on delete cascade,
  airtable_record_id text not null,
  participant_type text not null check (participant_type in ('participant', 'staff')),
  bus_id uuid null references public.trip_plan_buses(id) on delete set null,
  group_id uuid null references public.trip_plan_groups(id) on delete set null,
  local_notes text null,
  updated_at timestamptz not null default now(),
  primary key (trip_id, airtable_record_id)
);

create index if not exists trip_plan_buses_trip_idx
  on public.trip_plan_buses(trip_id);
create index if not exists trip_plan_groups_trip_idx
  on public.trip_plan_groups(trip_id);
create index if not exists trip_plan_participant_overrides_trip_idx
  on public.trip_plan_participant_overrides(trip_id);

alter table public.trip_plan_buses enable row level security;
alter table public.trip_plan_groups enable row level security;
alter table public.trip_plan_participant_overrides enable row level security;

drop policy if exists "trip_plan_buses_select_editors" on public.trip_plan_buses;
create policy "trip_plan_buses_select_editors"
on public.trip_plan_buses
for select
to authenticated
using (public.is_trip_plan_editor(trip_id, auth.uid()));

drop policy if exists "trip_plan_buses_modify_editors" on public.trip_plan_buses;
create policy "trip_plan_buses_modify_editors"
on public.trip_plan_buses
for all
to authenticated
using (public.is_trip_plan_editor(trip_id, auth.uid()))
with check (public.is_trip_plan_editor(trip_id, auth.uid()));

drop policy if exists "trip_plan_groups_select_editors" on public.trip_plan_groups;
create policy "trip_plan_groups_select_editors"
on public.trip_plan_groups
for select
to authenticated
using (public.is_trip_plan_editor(trip_id, auth.uid()));

drop policy if exists "trip_plan_groups_modify_editors" on public.trip_plan_groups;
create policy "trip_plan_groups_modify_editors"
on public.trip_plan_groups
for all
to authenticated
using (public.is_trip_plan_editor(trip_id, auth.uid()))
with check (public.is_trip_plan_editor(trip_id, auth.uid()));

drop policy if exists "trip_plan_participant_overrides_select_editors" on public.trip_plan_participant_overrides;
create policy "trip_plan_participant_overrides_select_editors"
on public.trip_plan_participant_overrides
for select
to authenticated
using (public.is_trip_plan_editor(trip_id, auth.uid()));

drop policy if exists "trip_plan_participant_overrides_modify_editors" on public.trip_plan_participant_overrides;
create policy "trip_plan_participant_overrides_modify_editors"
on public.trip_plan_participant_overrides
for all
to authenticated
using (public.is_trip_plan_editor(trip_id, auth.uid()))
with check (public.is_trip_plan_editor(trip_id, auth.uid()));

commit;
