begin;

alter table public.trip_plan_purchase_overrides
  add column if not exists unit_price numeric(12, 2) null;

commit;
