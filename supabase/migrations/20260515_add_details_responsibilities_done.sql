begin;

alter table public.trip_plan_rows
  add column if not exists details_done boolean not null default false,
  add column if not exists responsibilities_done boolean not null default false;

commit;
