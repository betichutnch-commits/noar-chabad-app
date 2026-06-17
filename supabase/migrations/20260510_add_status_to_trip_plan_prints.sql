begin;

alter table public.trip_plan_row_prints
  add column if not exists status text null;

commit;
