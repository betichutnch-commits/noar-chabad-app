begin;

alter table public.trip_plan_rows
  add column if not exists safety_done boolean not null default false,
  add column if not exists equipment_done boolean not null default false,
  add column if not exists prints_done boolean not null default false,
  add column if not exists notes_done boolean not null default false;

commit;
