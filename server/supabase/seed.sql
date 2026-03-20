-- ScanMark (Attendance Management) - Seed Data
-- Run this AFTER running: server/supabase/schema.sql
--
-- IMPORTANT:
-- This seed links application profile rows (public.users) to existing Supabase Auth users (auth.users)
-- via auth.users.id. That means you must create these Auth users FIRST.
--
-- Create these 3 Supabase Auth users (Dashboard -> Authentication -> Users -> Add user):
--   1) admin001@scanmark.demo  / admin123
--   2) fac001@scanmark.demo    / faculty123
--   3) stu001@scanmark.demo    / student123
--
-- Then run this seed.

begin;

do $$
declare
  admin_auth_id uuid;
  faculty_auth_id uuid;
  student_auth_id uuid;

  admin_user_id uuid;
  faculty_user_id uuid;
  v_student_user_id uuid;

  v_subject_id uuid;
begin
  -- 1) Resolve Auth UUIDs
  select id into admin_auth_id from auth.users where email = 'admin001@scanmark.demo' limit 1;
  if admin_auth_id is null then
    raise exception 'Missing Supabase Auth user for admin001. Create Auth user email=admin001@scanmark.demo password=admin123 first.';
  end if;

  select id into faculty_auth_id from auth.users where email = 'fac001@scanmark.demo' limit 1;
  if faculty_auth_id is null then
    raise exception 'Missing Supabase Auth user for fac001. Create Auth user email=fac001@scanmark.demo password=faculty123 first.';
  end if;

  select id into student_auth_id from auth.users where email = 'stu001@scanmark.demo' limit 1;
  if student_auth_id is null then
    raise exception 'Missing Supabase Auth user for stu001. Create Auth user email=stu001@scanmark.demo password=student123 first.';
  end if;

  -- 2) Ensure app-level profile rows (public.users)

  -- Admin
  select id
    into admin_user_id
  from public.users
  where auth_user_id = admin_auth_id
     or college_id = 'admin001'
     or email = 'admin001@scanmark.demo'
  limit 1;

  if admin_user_id is null then
    insert into public.users (auth_user_id, role, name, email, college_id, faculty_id)
    values (admin_auth_id, 'admin', 'Demo Admin', 'admin001@scanmark.demo', 'admin001', null)
    returning id into admin_user_id;
  else
    update public.users
      set auth_user_id = admin_auth_id,
          role = 'admin',
          name = 'Demo Admin',
          email = 'admin001@scanmark.demo',
          college_id = 'admin001',
          faculty_id = null
    where id = admin_user_id;
  end if;

  -- Faculty
  select id
    into faculty_user_id
  from public.users
  where auth_user_id = faculty_auth_id
     or faculty_id = 'fac001'
     or email = 'fac001@scanmark.demo'
  limit 1;

  if faculty_user_id is null then
    insert into public.users (auth_user_id, role, name, email, college_id, faculty_id)
    values (faculty_auth_id, 'faculty', 'Demo Faculty', 'fac001@scanmark.demo', null, 'fac001')
    returning id into faculty_user_id;
  else
    update public.users
      set auth_user_id = faculty_auth_id,
          role = 'faculty',
          name = 'Demo Faculty',
          email = 'fac001@scanmark.demo',
          college_id = null,
          faculty_id = 'fac001'
    where id = faculty_user_id;
  end if;

  -- Student
  select id
    into v_student_user_id
  from public.users
  where auth_user_id = student_auth_id
     or college_id = 'stu001'
     or email = 'stu001@scanmark.demo'
  limit 1;

  if v_student_user_id is null then
    insert into public.users (auth_user_id, role, name, email, college_id, faculty_id)
    values (student_auth_id, 'student', 'Demo Student', 'stu001@scanmark.demo', 'stu001', null)
    returning id into v_student_user_id;
  else
    update public.users
      set auth_user_id = student_auth_id,
          role = 'student',
          name = 'Demo Student',
          email = 'stu001@scanmark.demo',
          college_id = 'stu001',
          faculty_id = null
    where id = v_student_user_id;
  end if;

  -- 3) Role-specific tables

  -- Faculty profile row
  insert into public.faculty (user_id, faculty_id, name, email)
  values (faculty_user_id, 'fac001', 'Demo Faculty', 'fac001@scanmark.demo')
  on conflict (user_id) do update set
    faculty_id = excluded.faculty_id,
    name = excluded.name,
    email = excluded.email;

  -- Student profile row
  insert into public.students (user_id, college_id, name, email)
  values (v_student_user_id, 'stu001', 'Demo Student', 'stu001@scanmark.demo')
  on conflict (user_id) do update set
    college_id = excluded.college_id,
    name = excluded.name,
    email = excluded.email;

  -- 4) Minimal demo data
  -- One subject assigned to demo faculty + one timetable slot for demo student (today)
  insert into public.subjects (code, name, faculty_user_id)
  values ('CS101', 'Introduction to Computing', faculty_user_id)
  on conflict (code) do update set
    name = excluded.name,
    faculty_user_id = excluded.faculty_user_id
  returning id into v_subject_id;

  insert into public.timetable (student_user_id, subject_id, date, start_time, end_time, room)
  values (v_student_user_id, v_subject_id, now()::date, '09:00', '10:00', 'A-101')
  on conflict (student_user_id, subject_id, date, start_time) do update set
    end_time = excluded.end_time,
    room = excluded.room;

  raise notice '✅ ScanMark seed complete. Demo IDs: admin001, fac001, stu001';
end $$;

commit;