-- Keep profiles.status / is_approved in sync with auth user_metadata.status.
-- Sidebar and other UI previously counted profiles.status, which stayed "pending"
-- even after accounts were approved via update_user_status (metadata only).

begin;

-- One-time backfill from auth metadata
update public.profiles p
set
  status = coalesce(u.raw_user_meta_data->>'status', 'pending'),
  is_approved = (coalesce(u.raw_user_meta_data->>'status', 'pending') = 'approved')
from auth.users u
where u.id = p.id;

create or replace function public.update_user_status(user_id uuid, new_status text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_manager_actor(auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if new_status is null or new_status not in ('pending', 'approved', 'rejected') then
    raise exception 'invalid_status: %', new_status using errcode = '22023';
  end if;

  update auth.users
  set raw_user_meta_data = jsonb_set(
    coalesce(raw_user_meta_data, '{}'::jsonb),
    '{status}',
    to_jsonb(new_status),
    true
  )
  where id = user_id;

  update public.profiles
  set
    status = new_status,
    is_approved = (new_status = 'approved')
  where id = user_id;

  if not found then
    insert into public.profiles (id, status, is_approved, role)
    values (user_id, new_status, new_status = 'approved', 'user')
    on conflict (id) do update
      set status = excluded.status,
          is_approved = excluded.is_approved;
  end if;
end;
$$;

commit;
