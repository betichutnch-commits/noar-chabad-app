begin;

alter table public.trip_plan_rows
  add column if not exists staff_instructions text null,
  add column if not exists participant_instructions text null;

commit;
