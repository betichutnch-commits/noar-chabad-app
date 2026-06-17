begin;

create table if not exists public.trip_role_requirement_rules (
  id uuid primary key default gen_random_uuid(),
  role_key text not null,
  role_label text not null,
  trigger_type text not null check (trigger_type in ('always', 'category', 'event', 'organized_transport', 'sleeping', 'participant_ratio', 'bus_count')),
  category_key text null,
  event_label text null,
  calculation_type text not null check (calculation_type in ('fixed', 'ratio_participants', 'per_bus')),
  fixed_quantity integer not null default 1,
  ratio_per integer null,
  min_quantity integer not null default 0,
  merge_policy text not null default 'mergeable' check (merge_policy in ('mergeable', 'exclusive')),
  creates_staff_slot boolean not null default true,
  creates_bus_assignment boolean not null default false,
  creates_room_assignment boolean not null default false,
  creates_group_assignment boolean not null default false,
  order_index integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_required_staff_plan (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  role_key text not null,
  role_label text not null,
  source_summary text not null default '',
  required_quantity integer not null default 0,
  approved_quantity integer not null default 0,
  merge_policy text not null default 'mergeable' check (merge_policy in ('mergeable', 'exclusive')),
  status text not null default 'approved' check (status in ('approved', 'removed', 'needs_review')),
  notes text null,
  order_index integer not null default 0,
  decided_by uuid null references auth.users(id) on delete set null,
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, role_key)
);

create table if not exists public.trip_assignment_requirement_rules (
  id uuid primary key default gen_random_uuid(),
  assignment_key text not null,
  kind text not null check (kind in ('buses', 'groups', 'rooms', 'other')),
  title text not null,
  custom_kind_label text null,
  trigger_type text not null check (trigger_type in ('always', 'category', 'event', 'organized_transport', 'sleeping', 'participant_ratio', 'bus_count')),
  category_key text null,
  event_label text null,
  audience text not null default 'participants' check (audience in ('participants', 'staff', 'both')),
  creates_items boolean not null default false,
  order_index integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trip_role_requirement_rules_active_idx
  on public.trip_role_requirement_rules(is_active, order_index);

create index if not exists trip_required_staff_plan_trip_idx
  on public.trip_required_staff_plan(trip_id, order_index);

create index if not exists trip_assignment_requirement_rules_active_idx
  on public.trip_assignment_requirement_rules(is_active, order_index);

create unique index if not exists trip_plan_assignment_items_bus_unique
  on public.trip_plan_assignment_items(trip_id, assignment_set_id, bus_id)
  where bus_id is not null;

alter table public.trip_role_requirement_rules enable row level security;
alter table public.trip_required_staff_plan enable row level security;
alter table public.trip_assignment_requirement_rules enable row level security;

drop policy if exists "trip_role_requirement_rules_select_managers" on public.trip_role_requirement_rules;
create policy "trip_role_requirement_rules_select_managers"
on public.trip_role_requirement_rules
for select
to authenticated
using (public.is_manager_actor(auth.uid()));

drop policy if exists "trip_role_requirement_rules_modify_managers" on public.trip_role_requirement_rules;
create policy "trip_role_requirement_rules_modify_managers"
on public.trip_role_requirement_rules
for all
to authenticated
using (public.is_manager_actor(auth.uid()))
with check (public.is_manager_actor(auth.uid()));

drop policy if exists "trip_required_staff_plan_select_editors" on public.trip_required_staff_plan;
create policy "trip_required_staff_plan_select_editors"
on public.trip_required_staff_plan
for select
to authenticated
using (public.is_trip_plan_editor(trip_id, auth.uid()) or public.is_manager_actor(auth.uid()));

drop policy if exists "trip_required_staff_plan_modify_managers" on public.trip_required_staff_plan;
create policy "trip_required_staff_plan_modify_managers"
on public.trip_required_staff_plan
for all
to authenticated
using (public.is_manager_actor(auth.uid()))
with check (public.is_manager_actor(auth.uid()));

drop policy if exists "trip_assignment_requirement_rules_select_managers" on public.trip_assignment_requirement_rules;
create policy "trip_assignment_requirement_rules_select_managers"
on public.trip_assignment_requirement_rules
for select
to authenticated
using (public.is_manager_actor(auth.uid()));

drop policy if exists "trip_assignment_requirement_rules_modify_managers" on public.trip_assignment_requirement_rules;
create policy "trip_assignment_requirement_rules_modify_managers"
on public.trip_assignment_requirement_rules
for all
to authenticated
using (public.is_manager_actor(auth.uid()))
with check (public.is_manager_actor(auth.uid()));

commit;
