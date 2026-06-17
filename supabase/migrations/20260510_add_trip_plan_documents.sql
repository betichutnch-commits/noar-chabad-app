begin;

create table if not exists public.trip_plan_document_overrides (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  document_key text not null,
  status text null,
  owner text null,
  note text null,
  edit_url text null,
  pdf_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, document_key)
);

create index if not exists trip_plan_document_overrides_trip_idx
  on public.trip_plan_document_overrides(trip_id);

alter table public.trip_plan_document_overrides enable row level security;

drop policy if exists "trip_plan_document_overrides_select_editors" on public.trip_plan_document_overrides;
create policy "trip_plan_document_overrides_select_editors"
on public.trip_plan_document_overrides
for select
to authenticated
using (public.is_trip_plan_editor(trip_id, auth.uid()));

drop policy if exists "trip_plan_document_overrides_modify_editors" on public.trip_plan_document_overrides;
create policy "trip_plan_document_overrides_modify_editors"
on public.trip_plan_document_overrides
for all
to authenticated
using (public.is_trip_plan_editor(trip_id, auth.uid()))
with check (public.is_trip_plan_editor(trip_id, auth.uid()));

commit;
