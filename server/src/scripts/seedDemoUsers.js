const { loadEnv } = require('../config/env')
const { getSupabaseAdmin } = require('../lib/supabase')

function isDbNotInitializedError(err) {
  const message = (err && err.message) || ''
  return message.includes("Could not find the table 'public.users'")
}

async function findAuthUserByEmail(admin, email) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(error.message)
    const user = (data.users || []).find((u) => (u.email || '').toLowerCase() === email.toLowerCase())
    if (user) return user
    if (!data.users || data.users.length < 1000) return null
  }
  return null
}

async function ensureAccount({
  loginId,
  password,
  role,
  name,
  email,
  collegeId = null,
  facultyId = null,
}) {
  const admin = getSupabaseAdmin()

  // 1) Ensure Auth user exists
  let authUser = await findAuthUserByEmail(admin, email)
  if (!authUser) {
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, loginId, name },
    })
    if (error) throw new Error(error.message)
    authUser = created.user
  }

  // 2) Ensure profile row exists (if DB schema is installed)
  const { data: profile, error: profileError } = await admin
    .from('users')
    .select('id, auth_user_id, role, email')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()

  if (profileError) {
    if (isDbNotInitializedError(profileError)) {
      return { authUserId: authUser.id, userId: null, dbReady: false }
    }
    throw new Error(profileError.message)
  }

  let userId = profile?.id
  if (!userId) {
    const { data: inserted, error: insertError } = await admin
      .from('users')
      .insert({
        auth_user_id: authUser.id,
        role,
        name,
        email,
        college_id: collegeId,
        faculty_id: facultyId,
      })
      .select('id')
      .single()

    if (insertError) {
      if (isDbNotInitializedError(insertError)) {
        return { authUserId: authUser.id, userId: null, dbReady: false }
      }
      throw new Error(insertError.message)
    }
    userId = inserted.id
  }

  // 3) Ensure role table row exists
  if (role === 'student') {
    const { data: s, error: sErr } = await admin
      .from('students')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    if (sErr) throw new Error(sErr.message)
    if (!s) {
      const { error } = await admin.from('students').insert({
        user_id: userId,
        college_id: collegeId,
        name,
        email,
      })
      if (error) throw new Error(error.message)
    }
  }

  if (role === 'faculty') {
    const { data: f, error: fErr } = await admin
      .from('faculty')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    if (fErr) throw new Error(fErr.message)
    if (!f) {
      const { error } = await admin.from('faculty').insert({
        user_id: userId,
        faculty_id: facultyId,
        name,
        email,
      })
      if (error) throw new Error(error.message)
    }
  }

  return { authUserId: authUser.id, userId, dbReady: true }
}

async function main() {
  loadEnv()

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in server/.env')
  }

  // Demo credentials requested
  const adminCreds = {
    loginId: 'admin001',
    password: 'admin123',
    role: 'admin',
    name: 'Demo Admin',
    email: 'admin001@scanmark.demo',
    collegeId: 'admin001',
  }

  const facultyCreds = {
    loginId: 'fac001',
    password: 'faculty123',
    role: 'faculty',
    name: 'Demo Faculty',
    email: 'fac001@scanmark.demo',
    facultyId: 'fac001',
  }

  const studentCreds = {
    loginId: 'stu001',
    password: 'student123',
    role: 'student',
    name: 'Demo Student',
    email: 'stu001@scanmark.demo',
    collegeId: 'stu001',
  }

  // Create/ensure users
  const adminAccount = await ensureAccount(adminCreds)
  const facultyAccount = await ensureAccount(facultyCreds)
  const studentAccount = await ensureAccount(studentCreds)

  const dbReady = adminAccount.dbReady && facultyAccount.dbReady && studentAccount.dbReady
  if (!dbReady) {
    // eslint-disable-next-line no-console
    console.log('⚠️  Supabase DB schema not installed yet (public.users missing).')
    // eslint-disable-next-line no-console
    console.log('    Created Supabase Auth users only. Login will work, but app DB features require server/supabase/schema.sql.')
    // eslint-disable-next-line no-console
    console.log('✅ Seeded demo users (Auth only):')
    // eslint-disable-next-line no-console
    console.log('- admin001 / admin123')
    // eslint-disable-next-line no-console
    console.log('- fac001 / faculty123')
    // eslint-disable-next-line no-console
    console.log('- stu001 / student123')
    return
  }

  // Optional minimal data so dashboards are not empty: create a subject assigned to demo faculty
  const admin = getSupabaseAdmin()
  const { data: existingSubject, error: subjErr } = await admin
    .from('subjects')
    .select('id')
    .eq('code', 'CS101')
    .maybeSingle()
  if (subjErr) throw new Error(subjErr.message)

  let subjectId = existingSubject?.id
  if (!subjectId) {
    const { data: inserted, error } = await admin
      .from('subjects')
      .insert({
        code: 'CS101',
        name: 'Introduction to Computing',
        faculty_user_id: facultyAccount.userId,
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    subjectId = inserted.id
  }

  // Add timetable for demo student for today
  const today = new Date().toISOString().slice(0, 10)
  const { error: ttErr } = await admin
    .from('timetable')
    .upsert(
      {
        student_user_id: studentAccount.userId,
        subject_id: subjectId,
        date: today,
        start_time: '09:00',
        end_time: '10:00',
        room: 'A-101',
      },
      { onConflict: 'student_user_id,subject_id,date,start_time' },
    )
  if (ttErr) throw new Error(ttErr.message)

  // eslint-disable-next-line no-console
  console.log('✅ Seeded demo users (idempotent):')
  // eslint-disable-next-line no-console
  console.log('- admin001 / admin123')
  // eslint-disable-next-line no-console
  console.log('- fac001 / faculty123')
  // eslint-disable-next-line no-console
  console.log('- stu001 / student123')
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err.message)
  process.exit(1)
})
