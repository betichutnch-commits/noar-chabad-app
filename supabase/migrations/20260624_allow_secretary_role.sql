-- Allow secretary role in update_user_role RPC and is_manager_actor helper.
-- The app UI/API already support secretary; the DB RPC was missing it.

begin;

create or replace function public.is_manager_actor(actor_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = actor_id
      and (
        coalesce(p.role, '') in ('admin', 'safety_admin', 'secretary', 'dept_staff', 'dept_trips_officer')
        or coalesce(p.is_tech_admin, false) = true
      )
  );
$$;

create or replace function public.update_user_role(
  target_user_id uuid,
  new_role text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_manager_actor(auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if new_role is null or new_role not in (
    'coordinator',
    'dept_staff',
    'dept_trips_officer',
    'safety_admin',
    'secretary',
    'user'
  ) then
    raise exception 'invalid_role: %', new_role using errcode = '22023';
  end if;

  if target_user_id is null then
    raise exception 'missing_target_user_id' using errcode = '22023';
  end if;

  update public.profiles
    set role = new_role
    where id = target_user_id;

  if not found then
    insert into public.profiles (id, role)
      values (target_user_id, new_role)
      on conflict (id) do update set role = excluded.role;
  end if;

  update auth.users
    set raw_user_meta_data = jsonb_set(
      coalesce(raw_user_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb(new_role),
      true
    )
    where id = target_user_id;
end;
$$;

revoke all on function public.update_user_role(uuid, text) from public;
grant execute on function public.update_user_role(uuid, text) to authenticated;

commit;
