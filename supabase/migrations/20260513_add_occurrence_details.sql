begin;

alter table public.trip_plan_rows
  add column if not exists occurrence_details text null;

create table if not exists public.trip_plan_row_tasks (
  id uuid primary key default gen_random_uuid(),
  row_id uuid not null references public.trip_plan_rows(id) on delete cascade,
  phase text not null check (phase in ('preparation', 'during', 'after')),
  task_text text not null,
  assignee_name text null,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trip_plan_row_tasks_row_idx
  on public.trip_plan_row_tasks(row_id, order_index);

drop trigger if exists trip_plan_row_tasks_touch_updated_at on public.trip_plan_row_tasks;
create trigger trip_plan_row_tasks_touch_updated_at
after insert or update or delete on public.trip_plan_row_tasks
for each row execute function public.touch_trip_plan_updated_at();

alter table public.trip_plan_row_tasks enable row level security;

drop policy if exists "trip_plan_row_tasks_all_editors" on public.trip_plan_row_tasks;
create policy "trip_plan_row_tasks_all_editors"
on public.trip_plan_row_tasks
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
