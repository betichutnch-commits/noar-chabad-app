begin;

create table if not exists public.event_default_risks (
  id uuid primary key default gen_random_uuid(),
  category_key text not null,
  category_label text not null,
  event_label text not null,
  risk_text text not null,
  risk_level integer null check (risk_level between 1 and 5),
  likelihood integer null check (likelihood between 1 and 5),
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.event_default_risks
  add column if not exists likelihood integer null check (likelihood between 1 and 5);

create index if not exists event_default_risks_event_idx
  on public.event_default_risks(event_label, category_key, order_index);

create or replace function public.touch_event_default_risks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists event_default_risks_touch_updated_at on public.event_default_risks;
create trigger event_default_risks_touch_updated_at
before update on public.event_default_risks
for each row execute function public.touch_event_default_risks_updated_at();

alter table public.event_default_risks enable row level security;

drop policy if exists "event_default_risks_select_managers" on public.event_default_risks;
create policy "event_default_risks_select_managers"
on public.event_default_risks
for select
to authenticated
using (public.is_manager_actor(auth.uid()));

drop policy if exists "event_default_risks_modify_managers" on public.event_default_risks;
create policy "event_default_risks_modify_managers"
on public.event_default_risks
for all
to authenticated
using (public.is_manager_actor(auth.uid()))
with check (public.is_manager_actor(auth.uid()));

commit;
