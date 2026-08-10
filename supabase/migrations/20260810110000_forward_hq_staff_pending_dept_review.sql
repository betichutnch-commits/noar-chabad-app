-- Retroactively apply HQ-staff skip of department review:
-- trips already in pending_dept_review whose submitter is dept HQ staff
-- move straight to the safety queue (pending).

begin;

update public.trips t
set
  status = 'pending',
  dept_forwarded_at = coalesce(t.dept_forwarded_at, now()),
  dept_review_notes = null
where t.status = 'pending_dept_review'
  and exists (
    select 1
    from public.profiles p
    left join auth.users u on u.id = p.id
    where p.id = t.user_id
      and lower(coalesce(
        nullif(trim(p.role), ''),
        nullif(trim(u.raw_user_meta_data->>'role'), ''),
        ''
      )) in ('dept_staff', 'dept_trips_officer')
  );

commit;
