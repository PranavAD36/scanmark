# ScanMark — College Attendance Management System

Full-stack attendance system with role-based dashboards (admin/faculty/student), QR-based attendance sessions, and Supabase (Auth + Postgres).

## Tech Stack

- Client: React + Vite + Tailwind CSS
- Server: Node.js + Express
- Database/Auth: Supabase
- Language: JavaScript

## Folder Structure

- `client/` — frontend
- `server/` — backend

---

## 1) Supabase Setup

1. Create a Supabase project.
2. In Supabase **SQL Editor**, run the schema:
   - `server/supabase/schema.sql`
3. Create at least one **Admin** user (bootstrap):
   - Create a user in Supabase **Authentication** (email + password)
   - Then insert a matching profile row into `public.users` using the Auth user id.

Example SQL (replace values):

```sql
insert into public.users (auth_user_id, role, name, email)
values ('AUTH_USER_UUID_HERE', 'admin', 'Admin', 'admin@college.edu');
```

> Notes
>
> - The server uses the Supabase **service role key** to manage users and data.
> - Students/Faculty are created from the Admin UI (it creates the Auth user + profile rows).

---

## 2) Backend Setup (Express)

### Environment variables

Create `server/.env` (copy from `server/.env.example`):

- `PORT=4000`
- `CLIENT_ORIGIN=http://localhost:5173`
- `SUPABASE_URL=...`
- `SUPABASE_ANON_KEY=...`
- `SUPABASE_SERVICE_ROLE_KEY=...` (DO NOT expose this to the client)

### Install & run

```bash
cd server
npm install
npm run seed:demo
npm run dev
```

### Demo users (ready-to-login)

After running `npm run seed:demo` you can log in immediately with:

- `admin001` / `admin123`
- `fac001` / `faculty123`
- `stu001` / `student123`

API health check:

- `GET http://localhost:4000/health`

---

## 3) Frontend Setup (React + Vite)

### Environment variables

Create `client/.env` (copy from `client/.env.example`):

- `VITE_SUPABASE_URL=...`
- `VITE_SUPABASE_ANON_KEY=...`
- `VITE_API_URL=http://localhost:4000` (or `http://localhost:4000/api`)

### Install & run

```bash
cd client
npm install
npm run dev
```

Open:

- `http://localhost:5173`

---

## Core Features Implemented

### Auth

- Login with **College ID + password** (College ID resolves to email via `POST /api/auth/resolve-login`)
- Auto role detection via `GET /api/auth/me`
- Forgot password (Supabase email reset)
- Reset password page

### Admin

- Dashboard stats
- Add Student
- Add Faculty
- Manage Subjects
- Manage Users (list)

### Faculty

- Dashboard: today lectures / completed / remaining
- QR Session: select subject, generate QR (`qrcode`), 15-minute session window, end session
- Session Results: ended session stats
- Manual Attendance: mark present by student ID

### Student

- Dashboard: today present/absent + overall %
- Scan QR: single button, uses `html5-qrcode` (camera)
- Attendance Records: default today, selectable date
- Attendance Summary: subject-wise % + overall %
- Timetable: date-based view

---

## QR Logic (How it works)

- Faculty starts a session (`POST /api/sessions/start`), server stores `starts_at` + `ends_at` (15 min).
- QR payload contains JSON: `{ "sessionId": "...", "subjectId": "..." }`.
- Student scans QR and submits (`POST /api/attendance/scan`).
- Server validates:
  - Session exists
  - Subject matches
  - Session is active and not expired
  - Duplicate scans are blocked by a unique constraint: `(session_id, student_user_id)`

---

## Where to put `.env`

- Frontend: `client/.env`
- Backend: `server/.env`

---

## Troubleshooting

- Camera not working in desktop browser: test on a real phone or ensure HTTPS / permissions.
- If login by College ID fails: ensure `public.users.college_id` (or `faculty_id`) is populated and `email` is correct.

---

## Password Reset — Supabase Dashboard Configuration

The forgot password flow uses Supabase's built-in `resetPasswordForEmail` to send
a recovery email. The code dynamically uses `window.location.origin` for the
redirect URL, but **Supabase must be configured to allow those URLs** — otherwise
the email link will redirect to the wrong origin (e.g. localhost instead of production).

### Required settings (Supabase Dashboard)

1. **Authentication → URL Configuration → Site URL**
   - Set to your production URL: `https://scanmark-sage.vercel.app`
   - This is the fallback redirect when no explicit `redirectTo` is allowed.

2. **Authentication → URL Configuration → Redirect URLs**
   - Add **both** of these:
     - `http://localhost:5173/reset-password`
     - `https://scanmark-sage.vercel.app/reset-password`
   - You can also add wildcard patterns:
     - `http://localhost:5173/**`
     - `https://scanmark-sage.vercel.app/**`

3. **Authentication → Email Templates → Reset Password**
   - Customise the template HTML for ScanMark branding (logo, colors, name).
   - The `{{ .ConfirmationURL }}` variable inserts the reset link.

4. **Project Settings → Auth → SMTP Settings** _(optional, for branded sender)_
   - Enable "Custom SMTP"
   - Set sender name: `ScanMark`
   - Set sender email: `noreply@yourdomain.com`
   - Configure your SMTP host, port, username, password (SendGrid, Resend, etc.)

> **Why does the email link open localhost?**
>
> Supabase validates the `redirectTo` value against the Redirect URLs allowlist.
> If your production URL is not in the list, Supabase falls back to the **Site URL**.
> If Site URL is still `http://localhost:5173`, the user gets redirected there.
