begin;

alter table public.trip_plan_row_equipment
  add column if not exists quantity_unit text null;

commit;
