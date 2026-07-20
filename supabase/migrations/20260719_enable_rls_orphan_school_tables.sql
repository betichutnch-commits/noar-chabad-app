-- Enable RLS on leftover school-related tables that share this project.
-- These tables are empty and unused by the trips app; lock them down to clear
-- Supabase advisor rls_disabled_in_public.

begin;

alter table if exists public.lessons enable row level security;
alter table if exists public.messages enable row level security;
alter table if exists public.message_recipients enable row level security;
alter table if exists public.students enable row level security;
alter table if exists public.tasks enable row level security;

-- Authenticated admins only (matches classes_* pattern). No anon access.
drop policy if exists "lessons_admin" on public.lessons;
create policy "lessons_admin"
on public.lessons
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "messages_admin" on public.messages;
create policy "messages_admin"
on public.messages
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "message_recipients_admin" on public.message_recipients;
create policy "message_recipients_admin"
on public.message_recipients
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "students_admin" on public.students;
create policy "students_admin"
on public.students
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "tasks_admin" on public.tasks;
create policy "tasks_admin"
on public.tasks
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

commit;
