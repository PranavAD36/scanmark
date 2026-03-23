const { z } = require('zod')
const { getSupabaseAdmin } = require('../lib/supabase')
const { respondSupabaseError } = require('../lib/supabaseError')

function nowIso() {
  return new Date().toISOString()
}

async function scan(req, res, next) {
  try {
    const body = z
      .object({
        sessionId: z.string().uuid(),
        subjectId: z.string().uuid(),
      })
      .parse(req.body)

    const admin = getSupabaseAdmin()

    const { data: session, error: sError } = await admin
      .from('sessions')
      .select('id, subject_id, status, ends_at')
      .eq('id', body.sessionId)
      .maybeSingle()

    if (sError) return respondSupabaseError(res, sError)
    if (!session) return res.status(404).json({ error: 'Session not found' })

    if (session.subject_id !== body.subjectId) {
      return res.status(400).json({ error: 'Subject mismatch' })
    }

    if (session.status !== 'active') {
      return res.status(400).json({ error: 'Session not active' })
    }

    if (new Date(session.ends_at).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Session expired' })
    }

    const { error: insertError } = await admin.from('attendance').insert({
      session_id: body.sessionId,
      subject_id: body.subjectId,
      student_user_id: req.profile.id,
      scanned_at: nowIso(),
      status: 'present',
    })

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(409).json({ error: 'Duplicate attendance blocked' })
      }
      return respondSupabaseError(res, insertError, 400)
    }

    return res.status(201).json({ status: 'present' })
  } catch (err) {
    return next(err)
  }
}

async function manual(req, res, next) {
  try {
    const body = z
      .object({
        sessionId: z.string().uuid(),
        studentCollegeId: z.string().min(1),
      })
      .parse(req.body)

    const admin = getSupabaseAdmin()

    const { data: session, error: sError } = await admin
      .from('sessions')
      .select('id, faculty_user_id, subject_id, status, ends_at')
      .eq('id', body.sessionId)
      .maybeSingle()

    if (sError) return respondSupabaseError(res, sError)
    if (!session) return res.status(404).json({ error: 'Session not found' })

    if (session.faculty_user_id !== req.profile.id) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    if (session.status !== 'active' || new Date(session.ends_at).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Session not active' })
    }

    const { data: student, error: studentError } = await admin
      .from('users')
      .select('id')
      .eq('role', 'student')
      .eq('college_id', body.studentCollegeId)
      .maybeSingle()

    if (studentError) return respondSupabaseError(res, studentError)
    if (!student) return res.status(404).json({ error: 'Student not found' })

    const { error: insertError } = await admin.from('attendance').insert({
      session_id: session.id,
      subject_id: session.subject_id,
      student_user_id: student.id,
      scanned_at: nowIso(),
      status: 'present',
    })

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(409).json({ error: 'Duplicate attendance blocked' })
      }
      return respondSupabaseError(res, insertError, 400)
    }

    return res.status(201).json({ ok: true })
  } catch (err) {
    return next(err)
  }
}

async function records(req, res, next) {
  try {
    const admin = getSupabaseAdmin()

    let from = req.query.from
    let to = req.query.to

    if (!from || !to) {
      const date = req.query.date || new Date().toISOString().slice(0, 10)
      from = `${date}T00:00:00.000Z`
      to = `${date}T23:59:59.999Z`
    }

    // Fetch both present and absent attendance records for spent sessions
    const { data, error } = await admin
      .from('attendance')
      .select('id, session_id, scanned_at, status, subjects(code), sessions!inner(starts_at, status)')
      .eq('student_user_id', req.profile.id)
      .gte('sessions.starts_at', from)
      .lte('sessions.starts_at', to)
      .order('scanned_at', { ascending: false })

    if (error) return respondSupabaseError(res, error)

    const records = (data || []).map((r) => ({
      id: r.id,
      session_id: r.session_id,
      scanned_at: r.scanned_at,
      status: r.status,
      subject_code: r.subjects?.code,
    }))

    return res.json({ records })
  } catch (err) {
    return next(err)
  }
}

async function summary(req, res, next) {
  try {
    const admin = getSupabaseAdmin()

    // Subjects from timetable
    const { data: subjRows, error: subjError } = await admin
      .from('timetable')
      .select('subject_id, subjects(code, name)')
      .eq('student_user_id', req.profile.id)

    if (subjError) return respondSupabaseError(res, subjError)

    const subjectMap = new Map()
    for (const row of subjRows || []) {
      if (!row.subject_id) continue
      if (!subjectMap.has(row.subject_id)) {
        subjectMap.set(row.subject_id, {
          subject_id: row.subject_id,
          subject_code: row.subjects?.code,
          subject_name: row.subjects?.name,
        })
      }
    }

    // Also include subjects from the student's actual attendance records
    const { data: attSubjRows, error: attSubjError } = await admin
      .from('attendance')
      .select('subject_id, subjects(code, name)')
      .eq('student_user_id', req.profile.id)

    if (attSubjError) return respondSupabaseError(res, attSubjError)

    for (const row of attSubjRows || []) {
      if (!row.subject_id) continue
      if (!subjectMap.has(row.subject_id)) {
        subjectMap.set(row.subject_id, {
          subject_id: row.subject_id,
          subject_code: row.subjects?.code,
          subject_name: row.subjects?.name,
        })
      }
    }

    const subjectIds = Array.from(subjectMap.keys())

    const subjects = []
    let overallPresent = 0
    let overallTotal = 0

    for (const subjectId of subjectIds) {
      const code = subjectMap.get(subjectId)?.subject_code
      const name = subjectMap.get(subjectId)?.subject_name

      const { count: total, error: totalError } = await admin
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'ended')
        .eq('subject_id', subjectId)

      if (totalError) return respondSupabaseError(res, totalError)

      const { count: present, error: presentError } = await admin
        .from('attendance')
        .select('id, sessions!inner(status)', { count: 'exact', head: true })
        .eq('student_user_id', req.profile.id)
        .eq('subject_id', subjectId)
        .eq('sessions.status', 'ended')

      if (presentError) return respondSupabaseError(res, presentError)

      const t = total || 0
      const p = present || 0
      const percent = t > 0 ? Math.round((p / t) * 100) : 0

      overallPresent += p
      overallTotal += t

      subjects.push({
        subject_id: subjectId,
        subject_code: code,
        subject_name: name,
        present: p,
        total: t,
        percent,
      })
    }

    const overallPercent = overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : 0

    return res.json({ overallPercent, subjects })
  } catch (err) {
    return next(err)
  }
}

module.exports = { scan, manual, records, summary }
