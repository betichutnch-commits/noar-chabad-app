begin;

create table if not exists public.trip_plan_purchase_overrides (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  equipment_id uuid not null references public.trip_plan_row_equipment(id) on delete cascade,
  status text null,
  owner text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, equipment_id)
);

create table if not exists public.trip_plan_suppliers (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  phone text null,
  email text null,
  address text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, name)
);

create index if not exists trip_plan_purchase_overrides_trip_idx
  on public.trip_plan_purchase_overrides(trip_id);
create index if not exists trip_plan_purchase_overrides_equipment_idx
  on public.trip_plan_purchase_overrides(equipment_id);
create index if not exists trip_plan_suppliers_trip_idx
  on public.trip_plan_suppliers(trip_id);

alter table public.trip_plan_purchase_overrides enable row level security;
alter table public.trip_plan_suppliers enable row level security;

drop policy if exists "trip_plan_purchase_overrides_select_editors" on public.trip_plan_purchase_overrides;
create policy "trip_plan_purchase_overrides_select_editors"
on public.trip_plan_purchase_overrides
for select
to authenticated
using (public.is_trip_plan_editor(trip_id, auth.uid()));

drop policy if exists "trip_plan_purchase_overrides_modify_editors" on public.trip_plan_purchase_overrides;
create policy "trip_plan_purchase_overrides_modify_editors"
on public.trip_plan_purchase_overrides
for all
to authenticated
using (public.is_trip_plan_editor(trip_id, auth.uid()))
with check (public.is_trip_plan_editor(trip_id, auth.uid()));

drop policy if exists "trip_plan_suppliers_select_editors" on public.trip_plan_suppliers;
create policy "trip_plan_suppliers_select_editors"
on public.trip_plan_suppliers
for select
to authenticated
using (public.is_trip_plan_editor(trip_id, auth.uid()));

drop policy if exists "trip_plan_suppliers_modify_editors" on public.trip_plan_suppliers;
create policy "trip_plan_suppliers_modify_editors"
on public.trip_plan_suppliers
for all
to authenticated
using (public.is_trip_plan_editor(trip_id, auth.uid()))
with check (public.is_trip_plan_editor(trip_id, auth.uid()));

commit;
