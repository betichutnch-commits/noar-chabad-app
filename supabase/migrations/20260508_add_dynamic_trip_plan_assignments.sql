begin;

create table if not exists public.trip_plan_assignment_sets (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  kind text not null check (kind in ('groups', 'buses', 'rooms', 'other')),
  custom_kind_label text null,
  audience text not null check (audience in ('participants', 'staff', 'both')),
  title text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_plan_assignment_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  assignment_set_id uuid not null references public.trip_plan_assignment_sets(id) on delete cascade,
  bus_id uuid null references public.trip_plan_buses(id) on delete set null,
  name text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_plan_assignment_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  assignment_set_id uuid not null references public.trip_plan_assignment_sets(id) on delete cascade,
  assignment_item_id uuid not null references public.trip_plan_assignment_items(id) on delete cascade,
  participant_id uuid not null references public.trip_plan_participants(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (assignment_set_id, participant_id)
);

create index if not exists trip_plan_assignment_sets_trip_idx
  on public.trip_plan_assignment_sets(trip_id, order_index);
create index if not exists trip_plan_assignment_items_set_idx
  on public.trip_plan_assignment_items(assignment_set_id, order_index);
create index if not exists trip_plan_assignment_items_bus_idx
  on public.trip_plan_assignment_items(bus_id);
create index if not exists trip_plan_assignment_members_set_idx
  on public.trip_plan_assignment_members(assignment_set_id);
create index if not exists trip_plan_assignment_members_item_idx
  on public.trip_plan_assignment_members(assignment_item_id);
create index if not exists trip_plan_assignment_members_participant_idx
  on public.trip_plan_assignment_members(participant_id);

alter table public.trip_plan_assignment_sets enable row level security;
alter table public.trip_plan_assignment_items enable row level security;
alter table public.trip_plan_assignment_members enable row level security;

drop policy if exists "trip_plan_assignment_sets_select_editors" on public.trip_plan_assignment_sets;
create policy "trip_plan_assignment_sets_select_editors"
on public.trip_plan_assignment_sets
for select
to authenticated
using (public.is_trip_plan_editor(trip_id, auth.uid()));

drop policy if exists "trip_plan_assignment_sets_modify_editors" on public.trip_plan_assignment_sets;
create policy "trip_plan_assignment_sets_modify_editors"
on public.trip_plan_assignment_sets
for all
to authenticated
using (public.is_trip_plan_editor(trip_id, auth.uid()))
with check (public.is_trip_plan_editor(trip_id, auth.uid()));

drop policy if exists "trip_plan_assignment_items_select_editors" on public.trip_plan_assignment_items;
create policy "trip_plan_assignment_items_select_editors"
on public.trip_plan_assignment_items
for select
to authenticated
using (public.is_trip_plan_editor(trip_id, auth.uid()));

drop policy if exists "trip_plan_assignment_items_modify_editors" on public.trip_plan_assignment_items;
create policy "trip_plan_assignment_items_modify_editors"
on public.trip_plan_assignment_items
for all
to authenticated
using (public.is_trip_plan_editor(trip_id, auth.uid()))
with check (public.is_trip_plan_editor(trip_id, auth.uid()));

drop policy if exists "trip_plan_assignment_members_select_editors" on public.trip_plan_assignment_members;
create policy "trip_plan_assignment_members_select_editors"
on public.trip_plan_assignment_members
for select
to authenticated
using (public.is_trip_plan_editor(trip_id, auth.uid()));

drop policy if exists "trip_plan_assignment_members_modify_editors" on public.trip_plan_assignment_members;
create policy "trip_plan_assignment_members_modify_editors"
on public.trip_plan_assignment_members
for all
to authenticated
using (public.is_trip_plan_editor(trip_id, auth.uid()))
with check (public.is_trip_plan_editor(trip_id, auth.uid()));

commit;
