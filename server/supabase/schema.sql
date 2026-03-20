-- ScanMark (Attendance Management) - Supabase Schema
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- USERS (app-level profile table; maps to Supabase Auth users)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  role text not null check (role in ('admin','faculty','student')),
  name text not null,
  email text not null unique,
  college_id text unique,
  faculty_id text unique,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_auth_user_id on public.users(auth_user_id);
create index if not exists idx_users_role on public.users(role);

-- STUDENTS
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  college_id text not null unique,
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

-- FACULTY
create table if not exists public.faculty (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  faculty_id text not null unique,
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

-- SUBJECTS
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  faculty_user_id uuid references public.users(id) on delete set null,
  total_lectures int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_subjects_faculty on public.subjects(faculty_user_id);

-- SESSIONS (QR-based attendance session)
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  faculty_user_id uuid not null references public.users(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  ended_at timestamptz,
  status text not null check (status in ('active','ended','cancelled')),
  duration_minutes int not null default 15,
  present_count int not null default 0,
  absent_count int not null default 0,
  attendance_percent int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_sessions_subject on public.sessions(subject_id);
create index if not exists idx_sessions_faculty on public.sessions(faculty_user_id);
create index if not exists idx_sessions_starts_at on public.sessions(starts_at);

-- ATTENDANCE (one row per student scan per session)
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  student_user_id uuid not null references public.users(id) on delete cascade,
  scanned_at timestamptz not null default now(),
  status text not null default 'present',
  created_at timestamptz not null default now(),
  unique (session_id, student_user_id)
);

create index if not exists idx_attendance_student on public.attendance(student_user_id);
create index if not exists idx_attendance_session on public.attendance(session_id);

-- TIMETABLE (used for student schedule and for absent calculation on session end)
create table if not exists public.timetable (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references public.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  room text,
  created_at timestamptz not null default now(),
  unique (student_user_id, subject_id, date, start_time)
);

create index if not exists idx_timetable_student_date on public.timetable(student_user_id, date);
create index if not exists idx_timetable_subject_date on public.timetable(subject_id, date);

-- RPC: increment lecture count when a session ends
create or replace function public.increment_subject_lectures(subject_id uuid)
returns void
language sql
security definer
as $$
  update public.subjects
    set total_lectures = coalesce(total_lectures, 0) + 1
  where id = subject_id;
$$;

-- Optional: Enable RLS for safer defaults (server uses service role).
alter table public.users enable row level security;
alter table public.students enable row level security;
alter table public.faculty enable row level security;
alter table public.subjects enable row level security;
alter table public.sessions enable row level security;
alter table public.attendance enable row level security;
alter table public.timetable enable row level security;
