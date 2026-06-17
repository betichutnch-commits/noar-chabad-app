begin;

create table if not exists public.trip_plans (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null unique references public.trips(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_plan_rows (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.trip_plans(id) on delete cascade,
  order_index integer not null,
  day_index integer null,
  time_text text null,
  location_text text null,
  event_text text null,
  notes text null,
  owner_name text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, order_index)
);

create table if not exists public.trip_plan_row_safety (
  id uuid primary key default gen_random_uuid(),
  row_id uuid not null references public.trip_plan_rows(id) on delete cascade,
  order_index integer not null default 0,
  risk text null,
  mitigation text null,
  owner text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_plan_row_equipment (
  id uuid primary key default gen_random_uuid(),
  row_id uuid not null references public.trip_plan_rows(id) on delete cascade,
  order_index integer not null default 0,
  item text null,
  quantity text null,
  source_type text null,
  source_details text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_plan_row_prints (
  id uuid primary key default gen_random_uuid(),
  row_id uuid not null references public.trip_plan_rows(id) on delete cascade,
  order_index integer not null default 0,
  file_path text not null,
  file_name text null,
  quantity integer null,
  file_size_bytes bigint null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trip_plans_trip_id_idx
  on public.trip_plans(trip_id);
create index if not exists trip_plan_rows_plan_order_idx
  on public.trip_plan_rows(plan_id, order_index);
create index if not exists trip_plan_row_safety_row_idx
  on public.trip_plan_row_safety(row_id, order_index);
create index if not exists trip_plan_row_equipment_row_idx
  on public.trip_plan_row_equipment(row_id, order_index);
create index if not exists trip_plan_row_prints_row_idx
  on public.trip_plan_row_prints(row_id, order_index);

create or replace function public.is_trip_plan_editor(plan_trip_id uuid, actor_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.trips t
    where t.id = plan_trip_id
      and (
        t.user_id = actor_id
        or public.is_manager_actor(actor_id)
      )
  );
$$;

create or replace function public.touch_trip_plan_updated_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    update public.trip_plans set updated_at = now() where id = old.plan_id;
    return old;
  end if;
  update public.trip_plans set updated_at = now() where id = new.plan_id;
  return new;
end;
$$;

drop trigger if exists trip_plan_rows_touch_updated_at on public.trip_plan_rows;
create trigger trip_plan_rows_touch_updated_at
after insert or update or delete on public.trip_plan_rows
for each row execute function public.touch_trip_plan_updated_at();

alter table public.trip_plans enable row level security;
alter table public.trip_plan_rows enable row level security;
alter table public.trip_plan_row_safety enable row level security;
alter table public.trip_plan_row_equipment enable row level security;
alter table public.trip_plan_row_prints enable row level security;

drop policy if exists "trip_plans_select_editors" on public.trip_plans;
create policy "trip_plans_select_editors"
on public.trip_plans
for select
to authenticated
using (public.is_trip_plan_editor(trip_id, auth.uid()));

drop policy if exists "trip_plans_insert_editors" on public.trip_plans;
create policy "trip_plans_insert_editors"
on public.trip_plans
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.is_trip_plan_editor(trip_id, auth.uid())
);

drop policy if exists "trip_plans_update_editors" on public.trip_plans;
create policy "trip_plans_update_editors"
on public.trip_plans
for update
to authenticated
using (public.is_trip_plan_editor(trip_id, auth.uid()))
with check (public.is_trip_plan_editor(trip_id, auth.uid()));

drop policy if exists "trip_plan_rows_all_editors" on public.trip_plan_rows;
create policy "trip_plan_rows_all_editors"
on public.trip_plan_rows
for all
to authenticated
using (
  exists (
    select 1
    from public.trip_plans p
    where p.id = plan_id
      and public.is_trip_plan_editor(p.trip_id, auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.trip_plans p
    where p.id = plan_id
      and public.is_trip_plan_editor(p.trip_id, auth.uid())
  )
);

drop policy if exists "trip_plan_row_safety_all_editors" on public.trip_plan_row_safety;
create policy "trip_plan_row_safety_all_editors"
on public.trip_plan_row_safety
for all
to authenticated
using (
  exists (
    select 1
    from public.trip_plan_rows r
    join public.trip_plans p on p.id = r.plan_id
    where r.id = row_id
      and public.is_trip_plan_editor(p.trip_id, auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.trip_plan_rows r
    join public.trip_plans p on p.id = r.plan_id
    where r.id = row_id
      and public.is_trip_plan_editor(p.trip_id, auth.uid())
  )
);

drop policy if exists "trip_plan_row_equipment_all_editors" on public.trip_plan_row_equipment;
create policy "trip_plan_row_equipment_all_editors"
on public.trip_plan_row_equipment
for all
to authenticated
using (
  exists (
    select 1
    from public.trip_plan_rows r
    join public.trip_plans p on p.id = r.plan_id
    where r.id = row_id
      and public.is_trip_plan_editor(p.trip_id, auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.trip_plan_rows r
    join public.trip_plans p on p.id = r.plan_id
    where r.id = row_id
      and public.is_trip_plan_editor(p.trip_id, auth.uid())
  )
);

drop policy if exists "trip_plan_row_prints_all_editors" on public.trip_plan_row_prints;
create policy "trip_plan_row_prints_all_editors"
on public.trip_plan_row_prints
for all
to authenticated
using (
  exists (
    select 1
    from public.trip_plan_rows r
    join public.trip_plans p on p.id = r.plan_id
    where r.id = row_id
      and public.is_trip_plan_editor(p.trip_id, auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.trip_plan_rows r
    join public.trip_plans p on p.id = r.plan_id
    where r.id = row_id
      and public.is_trip_plan_editor(p.trip_id, auth.uid())
  )
);

commit;
