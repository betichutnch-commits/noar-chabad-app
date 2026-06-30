begin;

create table if not exists public.trip_plan_row_designs (
  id uuid primary key default gen_random_uuid(),
  row_id uuid not null references public.trip_plan_rows(id) on delete cascade,
  order_index integer not null default 0,
  document_name text not null,
  designer_name text null,
  size_settings text null,
  notes text null,
  content_mode text not null default 'text' check (content_mode in ('text', 'file')),
  document_text text null,
  designer_instructions text null,
  brief_file_path text null,
  brief_file_name text null,
  output_file_path text null,
  output_file_name text null,
  status text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trip_plan_row_designs_row_idx
  on public.trip_plan_row_designs(row_id, order_index);

alter table public.trip_plan_row_designs enable row level security;

drop policy if exists "trip_plan_row_designs_all_editors" on public.trip_plan_row_designs;
create policy "trip_plan_row_designs_all_editors"
on public.trip_plan_row_designs
for all
to authenticated
using (
  exists (
    select 1
    from public.trip_plan_rows r
    join public.trip_plans p on p.id = r.plan_id
    where r.id = row_id
      and public.is_trip_plan_editor(p.trip_id, auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.trip_plan_rows r
    join public.trip_plans p on p.id = r.plan_id
    where r.id = row_id
      and public.is_trip_plan_editor(p.trip_id, auth.uid())
  )
);

alter table public.trip_plan_row_prints
  add column if not exists design_id uuid null references public.trip_plan_row_designs(id) on delete set null;

create index if not exists trip_plan_row_prints_design_idx
  on public.trip_plan_row_prints(design_id);

commit;
