const { z } = require('zod')
const { getSupabaseAdmin } = require('../lib/supabase')
const { respondSupabaseError } = require('../lib/supabaseError')

async function list(req, res, next) {
  try {
    const admin = getSupabaseAdmin()

    if (req.profile.role === 'faculty') {
      const { data, error } = await admin
        .from('subjects')
        .select('id, code, name, faculty_user_id')
        .eq('faculty_user_id', req.profile.id)
        .order('code')
      if (error) return respondSupabaseError(res, error)
      return res.json({ subjects: data })
    }

    if (req.profile.role === 'student') {
      const { data, error } = await admin
        .from('timetable')
        .select('subject_id, subjects(id, code, name, faculty_user_id)')
        .eq('student_user_id', req.profile.id)

      if (error) return respondSupabaseError(res, error)

      const unique = new Map()
      for (const row of data) {
        if (row.subjects?.id && !unique.has(row.subjects.id)) unique.set(row.subjects.id, row.subjects)
      }
      return res.json({ subjects: Array.from(unique.values()) })
    }

    // admin: all subjects
    const { data, error } = await admin
      .from('subjects')
      .select('id, code, name, faculty_user_id, faculty:faculty_user_id(faculty_id)')
      .order('code')

    if (error) return respondSupabaseError(res, error)

    const subjects = (data || []).map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      faculty_id: s.faculty?.faculty_id || null,
      faculty_user_id: s.faculty_user_id,
    }))

    return res.json({ subjects })
  } catch (err) {
    return next(err)
  }
}

async function create(req, res, next) {
  try {
    if (req.profile.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can create subjects' })
    }

    const body = z
      .object({
        code: z.string().min(1),
        name: z.string().min(1),
        facultyId: z.string().nullable().optional(),
      })
      .parse(req.body)

    const admin = getSupabaseAdmin()

    let facultyUserId = null
    if (body.facultyId) {
      const { data: fac, error: facError } = await admin
        .from('users')
        .select('id')
        .eq('role', 'faculty')
        .eq('faculty_id', body.facultyId)
        .maybeSingle()
      if (facError) return respondSupabaseError(res, facError)
      if (!fac) return res.status(400).json({ error: 'Faculty not found' })
      facultyUserId = fac.id
    }

    const { data, error } = await admin
      .from('subjects')
      .insert({
        code: body.code,
        name: body.name,
        faculty_user_id: facultyUserId,
      })
      .select('id')
      .single()

    if (error) return respondSupabaseError(res, error, 400)
    return res.status(201).json({ id: data.id })
  } catch (err) {
    return next(err)
  }
}

async function remove(req, res, next) {
  try {
    if (req.profile.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can delete subjects' })
    }

    const id = req.params.id
    const admin = getSupabaseAdmin()
    const { error } = await admin.from('subjects').delete().eq('id', id)
    if (error) return respondSupabaseError(res, error, 400)
    return res.json({ ok: true })
  } catch (err) {
    return next(err)
  }
}

module.exports = { list, create, remove }
