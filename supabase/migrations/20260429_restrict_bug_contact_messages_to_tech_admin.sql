-- Restrict bug-related contact messages access/update to tech admins only.
-- Keeps general contact inbox available to manager actors.

begin;

create or replace function public.is_tech_admin_actor(actor_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = actor_id
      and coalesce(p.is_tech_admin, false) = true
  );
$$;

drop policy if exists "contact_messages_select_own_or_manager" on public.contact_messages;
create policy "contact_messages_select_own_or_manager"
on public.contact_messages
for select
using (
  auth.uid() = user_id
  or (
    coalesce(lower(category), 'general') = 'bug'
    and public.is_tech_admin_actor(auth.uid())
  )
  or (
    coalesce(lower(category), 'general') <> 'bug'
    and public.is_manager_actor(auth.uid())
  )
);

drop policy if exists "contact_messages_update_manager_only" on public.contact_messages;
create policy "contact_messages_update_manager_only"
on public.contact_messages
for update
using (
  (
    coalesce(lower(category), 'general') = 'bug'
    and public.is_tech_admin_actor(auth.uid())
  )
  or (
    coalesce(lower(category), 'general') <> 'bug'
    and public.is_manager_actor(auth.uid())
  )
)
with check (
  (
    coalesce(lower(category), 'general') = 'bug'
    and public.is_tech_admin_actor(auth.uid())
  )
  or (
    coalesce(lower(category), 'general') <> 'bug'
    and public.is_manager_actor(auth.uid())
  )
);

commit;
