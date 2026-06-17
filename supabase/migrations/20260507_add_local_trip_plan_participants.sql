begin;

create table if not exists public.trip_plan_participants (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  source text not null default 'manual' check (source in ('manual', 'excel', 'airtable')),
  source_record_id text null,
  participant_type text not null check (participant_type in ('participant', 'staff')),
  full_name text not null,
  phone text null,
  contact_phone text null,
  registration_status text null,
  payment_status text null,
  parent_approval text null,
  medical_notes text null,
  role text null,
  notes text null,
  bus_id uuid null references public.trip_plan_buses(id) on delete set null,
  group_id uuid null references public.trip_plan_groups(id) on delete set null,
  local_notes text null,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists trip_plan_participants_source_key
  on public.trip_plan_participants(trip_id, source, source_record_id);

create index if not exists trip_plan_participants_trip_idx
  on public.trip_plan_participants(trip_id, participant_type);
create index if not exists trip_plan_participants_bus_idx
  on public.trip_plan_participants(bus_id);
create index if not exists trip_plan_participants_group_idx
  on public.trip_plan_participants(group_id);

alter table public.trip_plan_participants enable row level security;

drop policy if exists "trip_plan_participants_select_editors" on public.trip_plan_participants;
create policy "trip_plan_participants_select_editors"
on public.trip_plan_participants
for select
to authenticated
using (public.is_trip_plan_editor(trip_id, auth.uid()));

drop policy if exists "trip_plan_participants_modify_editors" on public.trip_plan_participants;
create policy "trip_plan_participants_modify_editors"
on public.trip_plan_participants
for all
to authenticated
using (public.is_trip_plan_editor(trip_id, auth.uid()))
with check (public.is_trip_plan_editor(trip_id, auth.uid()));

commit;
