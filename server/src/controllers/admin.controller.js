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

module.exports = {
  stats,
  listStudents,
  listFaculty,
  listUsers,
  createStudent,
  createFaculty,
}
