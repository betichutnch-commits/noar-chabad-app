begin;

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default 'true'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null
);

create or replace function public.touch_app_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_settings_touch_updated_at on public.app_settings;
create trigger app_settings_touch_updated_at
before update on public.app_settings
for each row execute function public.touch_app_settings_updated_at();

insert into public.app_settings (key, value)
values ('sustainability_motifs_enabled', 'true'::jsonb)
on conflict (key) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_select_authenticated" on public.app_settings;
create policy "app_settings_select_authenticated"
on public.app_settings
for select
to authenticated
using (true);

drop policy if exists "app_settings_modify_managers" on public.app_settings;
create policy "app_settings_modify_managers"
on public.app_settings
for all
to authenticated
using (public.is_manager_actor(auth.uid()))
with check (public.is_manager_actor(auth.uid()));

commit;
