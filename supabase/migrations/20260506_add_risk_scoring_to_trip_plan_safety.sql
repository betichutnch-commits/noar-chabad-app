begin;

alter table public.trip_plan_row_safety
  add column if not exists risk_level_before smallint null,
  add column if not exists likelihood_before smallint null,
  add column if not exists risk_level_after smallint null,
  add column if not exists likelihood_after smallint null;

commit;
