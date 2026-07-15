const { z } = require('zod')
const { getSupabaseAdmin } = require('../lib/supabase')
const { respondSupabaseError } = require('../lib/supabaseError')

async function stats(_req, res, next) {
  try {
    const admin = getSupabaseAdmin()

    const students = await admin.from('students').select('id', { count: 'exact', head: true })
    const faculty = await admin.from('faculty').select('id', { count: 'exact', head: true })
    const subjects = await admin.from('subjects').select('id', { count: 'exact', head: true })

    const today = new Date().toISOString().slice(0, 10)
    const sessionsToday = await admin
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .gte('starts_at', `${today}T00:00:00.000Z`)
      .lte('starts_at', `${today}T23:59:59.999Z`)

    if (students.error) return respondSupabaseError(res, students.error)
    if (faculty.error) return respondSupabaseError(res, faculty.error)
    if (subjects.error) return respondSupabaseError(res, subjects.error)
    if (sessionsToday.error) {
      return respondSupabaseError(res, sessionsToday.error)
    }

    return res.json({
      students: students.count || 0,
      faculty: faculty.count || 0,
      subjects: subjects.count || 0,
      sessionsToday: sessionsToday.count || 0,
    })
  } catch (err) {
    return next(err)
  }
}

async function listStudents(_req, res, next) {
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('users')
      .select('id, name, email, college_id')
      .eq('role', 'student')
      .order('created_at', { ascending: false })

    if (error) return respondSupabaseError(res, error)
    return res.json({ students: data })
  } catch (err) {
    return next(err)
  }
}

async function listFaculty(_req, res, next) {
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('users')
      .select('id, name, email, faculty_id')
      .eq('role', 'faculty')
      .order('created_at', { ascending: false })

    if (error) return respondSupabaseError(res, error)
    return res.json({ faculty: data })
  } catch (err) {
    return next(err)
  }
}

async function listUsers(_req, res, next) {
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('users')
      .select('id, name, email, role, college_id, faculty_id')
      .order('created_at', { ascending: false })

    if (error) return respondSupabaseError(res, error)
    return res.json({ users: data })
  } catch (err) {
    return next(err)
  }
}

async function createStudent(req, res, next) {
  try {
    const body = z
      .object({
        collegeId: z.string().min(1),
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8),
      })
      .parse(req.body)

    const admin = getSupabaseAdmin()

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { role: 'student', collegeId: body.collegeId, name: body.name },
    })

    if (createError) return res.status(400).json({ error: createError.message })

    const authUserId = created.user.id

    const { data: userRow, error: userError } = await admin
      .from('users')
      .insert({
        auth_user_id: authUserId,
        role: 'student',
        name: body.name,
        email: body.email,
        college_id: body.collegeId,
      })
      .select('id')
      .single()

    if (userError) return respondSupabaseError(res, userError, 400)

    const { error: studentError } = await admin.from('students').insert({
      user_id: userRow.id,
      college_id: body.collegeId,
      name: body.name,
      email: body.email,
    })

    if (studentError) return respondSupabaseError(res, studentError, 400)

    return res.status(201).json({ ok: true })
  } catch (err) {
    return next(err)
  }
}

async function createFaculty(req, res, next) {
  try {
    const body = z
      .object({
        facultyId: z.string().min(1),
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8),
      })
      .parse(req.body)

    const admin = getSupabaseAdmin()

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { role: 'faculty', facultyId: body.facultyId, name: body.name },
    })

    if (createError) return res.status(400).json({ error: createError.message })

    const authUserId = created.user.id

    const { data: userRow, error: userError } = await admin
      .from('users')
      .insert({
        auth_user_id: authUserId,
        role: 'faculty',
        name: body.name,
        email: body.email,
        faculty_id: body.facultyId,
      })
      .select('id')
      .single()

    if (userError) return respondSupabaseError(res, userError, 400)

    const { error: facultyError } = await admin.from('faculty').insert({
      user_id: userRow.id,
      faculty_id: body.facultyId,
      name: body.name,
      email: body.email,
    })

    if (facultyError) return respondSupabaseError(res, facultyError, 400)

    return res.status(201).json({ ok: true })
  } catch (err) {
    return next(err)
  }
}

async function deleteUser(req, res, next) {
  try {
    const id = req.params.id
    const admin = getSupabaseAdmin()

    const { data: user, error: fetchErr } = await admin
      .from('users')
      .select('auth_user_id, role')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr) return respondSupabaseError(res, fetchErr)
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Cannot delete admin users' })
    }

    // Delete from users table (cascades to students/faculty via FK)
    const { error: delErr } = await admin.from('users').delete().eq('id', id)
    if (delErr) return respondSupabaseError(res, delErr)

    // Delete from Supabase Auth
    const { error: authErr } = await admin.auth.admin.deleteUser(user.auth_user_id)
    if (authErr) {
      // eslint-disable-next-line no-console
      console.warn('Failed to delete auth user', authErr)
    }

    return res.json({ ok: true })
  } catch (err) {
    return next(err)
  }
}

async function updateUser(req, res, next) {
  try {
    const id = req.params.id
    const parsed = z
      .object({
        name: z.string().min(1, 'Name is required').optional(),
        email: z.string().email('Invalid email address').optional(),
        collegeId: z.string().min(1, 'College ID is required').optional(),
        facultyId: z.string().min(1, 'Faculty ID is required').optional(),
        password: z.string().min(8, 'Password must be at least 8 characters').optional(),
      })
      .safeParse(req.body)

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      return res.status(400).json({ error: firstIssue?.message || 'Validation failed' })
    }

    const body = parsed.data
    const admin = getSupabaseAdmin()

    const { data: user, error: fetchErr } = await admin
      .from('users')
      .select('id, auth_user_id, role')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr) return respondSupabaseError(res, fetchErr)
    if (!user) return res.status(404).json({ error: 'User not found' })

    // Update users table
    const usersUpdate = {}
    if (body.name) usersUpdate.name = body.name
    if (body.email) usersUpdate.email = body.email
    if (body.collegeId && user.role === 'student') usersUpdate.college_id = body.collegeId
    if (body.facultyId && user.role === 'faculty') usersUpdate.faculty_id = body.facultyId

    if (Object.keys(usersUpdate).length) {
      const { error: uErr } = await admin.from('users').update(usersUpdate).eq('id', id)
      if (uErr) return respondSupabaseError(res, uErr, 400)
    }

    // Update profile table
    if (user.role === 'student') {
      const stuUpdate = {}
      if (body.name) stuUpdate.name = body.name
      if (body.email) stuUpdate.email = body.email
      if (body.collegeId) stuUpdate.college_id = body.collegeId
      if (Object.keys(stuUpdate).length) {
        await admin.from('students').update(stuUpdate).eq('user_id', id)
      }
    } else if (user.role === 'faculty') {
      const facUpdate = {}
      if (body.name) facUpdate.name = body.name
      if (body.email) facUpdate.email = body.email
      if (body.facultyId) facUpdate.faculty_id = body.facultyId
      if (Object.keys(facUpdate).length) {
        await admin.from('faculty').update(facUpdate).eq('user_id', id)
      }
    }

    // Update auth if email or password changed
    const authUpdate = {}
    if (body.email) authUpdate.email = body.email
    if (body.password) authUpdate.password = body.password
    if (Object.keys(authUpdate).length) {
      const { error: authErr } = await admin.auth.admin.updateUserById(
        user.auth_user_id,
        authUpdate,
      )
      if (authErr) return res.status(400).json({ error: authErr.message })
    }

    return res.json({ ok: true })
  } catch (err) {
    return next(err)
  }
}

module.exports = {
  stats,
  listStudents,
  listFaculty,
  listUsers,
  createStudent,
  createFaculty,
  deleteUser,
  updateUser,
}
