begin;

alter table public.trip_plan_row_prints
  add column if not exists print_size text null,
  add column if not exists page_type text null,
  add column if not exists print_location text null;

commit;
