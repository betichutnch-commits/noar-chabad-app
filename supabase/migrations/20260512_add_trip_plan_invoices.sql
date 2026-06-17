begin;

create table if not exists public.trip_plan_invoices (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  equipment_id uuid null references public.trip_plan_row_equipment(id) on delete set null,
  amount numeric(12, 2) null,
  supplier_name text null,
  invoice_number text null,
  notes text null,
  file_url text not null,
  file_name text not null,
  file_type text null,
  file_size integer null,
  submission_status text not null default 'draft',
  submitted_at timestamptz null,
  submitted_to_profile_id uuid null references public.profiles(id) on delete set null,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trip_plan_invoices_trip_idx
  on public.trip_plan_invoices(trip_id, created_at desc);
create index if not exists trip_plan_invoices_equipment_idx
  on public.trip_plan_invoices(equipment_id);
create index if not exists trip_plan_invoices_submission_status_idx
  on public.trip_plan_invoices(submission_status);

alter table public.trip_plan_invoices enable row level security;

drop policy if exists "trip_plan_invoices_select_editors" on public.trip_plan_invoices;
create policy "trip_plan_invoices_select_editors"
on public.trip_plan_invoices
for select
to authenticated
using (public.is_trip_plan_editor(trip_id, auth.uid()));

drop policy if exists "trip_plan_invoices_modify_editors" on public.trip_plan_invoices;
create policy "trip_plan_invoices_modify_editors"
on public.trip_plan_invoices
for all
to authenticated
using (public.is_trip_plan_editor(trip_id, auth.uid()))
with check (public.is_trip_plan_editor(trip_id, auth.uid()));

commit;
