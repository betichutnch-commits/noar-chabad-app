begin;

alter table public.trip_plan_rows
  add column if not exists owner_participant_id uuid references public.trip_plan_participants(id) on delete set null,
  add column if not exists owner_role_key text null;

alter table public.trip_plan_row_tasks
  add column if not exists assignee_participant_id uuid references public.trip_plan_participants(id) on delete set null,
  add column if not exists assignee_role_key text null;

alter table public.trip_plan_row_safety
  add column if not exists owner_participant_id uuid references public.trip_plan_participants(id) on delete set null,
  add column if not exists owner_role_key text null;

create index if not exists trip_plan_rows_owner_participant_idx
  on public.trip_plan_rows(owner_participant_id)
  where owner_participant_id is not null;

create index if not exists trip_plan_row_tasks_assignee_participant_idx
  on public.trip_plan_row_tasks(assignee_participant_id)
  where assignee_participant_id is not null;

create index if not exists trip_plan_row_safety_owner_participant_idx
  on public.trip_plan_row_safety(owner_participant_id)
  where owner_participant_id is not null;

commit;
