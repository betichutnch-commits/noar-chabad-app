-- HQ multi-roles: profiles.hq_roles + backfill from auth metadata / can_dept_review.

begin;

alter table public.profiles
  add column if not exists hq_roles jsonb not null default '[]'::jsonb;

-- Backfill from auth.users metadata
update public.profiles p
set hq_roles = coalesce(
  case
    when jsonb_typeof(u.raw_user_meta_data->'hq_roles') = 'array'
         and jsonb_array_length(u.raw_user_meta_data->'hq_roles') > 0
      then u.raw_user_meta_data->'hq_roles'
    when coalesce(u.raw_user_meta_data->>'role', '') = 'dept_trips_officer'
      then '["branch_officer"]'::jsonb
    when coalesce(u.raw_user_meta_data->>'can_dept_review', '') in ('true', '1', 'yes')
      then '["branch_officer"]'::jsonb
    when coalesce(u.raw_user_meta_data->>'role', '') = 'dept_staff'
      then '["dept_member"]'::jsonb
    else '[]'::jsonb
  end,
  '[]'::jsonb
)
from auth.users u
where u.id = p.id;

-- Mirror hq_roles + can_dept_review back into auth metadata for dept_staff
update auth.users u
set raw_user_meta_data =
  jsonb_set(
    jsonb_set(
      coalesce(u.raw_user_meta_data, '{}'::jsonb),
      '{hq_roles}',
      coalesce(p.hq_roles, '[]'::jsonb),
      true
    ),
    '{can_dept_review}',
    to_jsonb(
      exists (
        select 1
        from jsonb_array_elements_text(coalesce(p.hq_roles, '[]'::jsonb)) r(role)
        where r.role = 'branch_officer'
      )
    ),
    true
  )
from public.profiles p
where p.id = u.id
  and coalesce(u.raw_user_meta_data->>'role', p.role, '') in ('dept_staff', 'dept_trips_officer');

commit;
