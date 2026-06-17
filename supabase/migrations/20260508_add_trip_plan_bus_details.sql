alter table public.trip_plan_buses
  add column if not exists bus_number text null,
  add column if not exists driver_name text null,
  add column if not exists driver_phone text null,
  add column if not exists company text null,
  add column if not exists leader_phone text null,
  add column if not exists leader_email text null;
