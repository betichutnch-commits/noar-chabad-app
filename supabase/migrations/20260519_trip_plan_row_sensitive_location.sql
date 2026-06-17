begin;

alter table public.trip_plan_rows
  add column if not exists location_sensitive boolean not null default false;

commit;
