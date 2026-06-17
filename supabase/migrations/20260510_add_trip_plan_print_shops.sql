begin;

create table if not exists public.trip_plan_print_shops (
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

create index if not exists trip_plan_print_shops_trip_idx
  on public.trip_plan_print_shops(trip_id);

alter table public.trip_plan_print_shops enable row level security;

drop policy if exists "trip_plan_print_shops_select_editors" on public.trip_plan_print_shops;
create policy "trip_plan_print_shops_select_editors"
on public.trip_plan_print_shops
for select
to authenticated
using (public.is_trip_plan_editor(trip_id, auth.uid()));

drop policy if exists "trip_plan_print_shops_modify_editors" on public.trip_plan_print_shops;
create policy "trip_plan_print_shops_modify_editors"
on public.trip_plan_print_shops
for all
to authenticated
using (public.is_trip_plan_editor(trip_id, auth.uid()))
with check (public.is_trip_plan_editor(trip_id, auth.uid()));

commit;
