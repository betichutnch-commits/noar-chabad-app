-- RPC לעדכון תפקיד משתמש על ידי מנהל בטיחות / אדמין.
-- מסונכרן את profiles.role עם auth.users.raw_user_meta_data.role
-- כדי ש־RLS וה־helpers ב־client (isManagerUser, isDeptTripsOfficer) יעבדו מיידית.
--
-- הפעולה מוגנת ב־is_manager_actor(auth.uid()) שכבר הוגדרה ב־
-- 20260426_full_security_lockdown.sql.
--
-- ערכים מותרים: coordinator, dept_staff, dept_trips_officer, safety_admin, user.
-- (admin שמור לבסיס נתונים בלבד ולא נחשף דרך ה־RPC.)

begin;

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
