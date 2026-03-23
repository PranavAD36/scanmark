const { z } = require('zod')
const { getSupabaseAdmin } = require('../lib/supabase')
const { respondSupabaseError } = require('../lib/supabaseError')

function nowIso() {
  return new Date().toISOString()
}

function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

async function start(req, res, next) {
  try {
    const body = z
      .object({
        subjectId: z.string().uuid(),
      })
      .parse(req.body)

    const admin = getSupabaseAdmin()

    // Validate subject belongs to this faculty (or is unassigned but faculty starting it)
    const { data: subject, error: subjectError } = await admin
      .from('subjects')
      .select('id, faculty_user_id')
      .eq('id', body.subjectId)
      .maybeSingle()

    if (subjectError) return respondSupabaseError(res, subjectError)
    if (!subject) return res.status(404).json({ error: 'Subject not found' })
    if (subject.faculty_user_id && subject.faculty_user_id !== req.profile.id) {
      return res.status(403).json({ error: 'Subject not assigned to this faculty' })
    }

    // If an active (non-expired) session already exists for this faculty+subject,
    // return it instead of creating duplicates (common after refresh).
    const now = nowIso()
    const { data: existingSession, error: existingError } = await admin
      .from('sessions')
      .select('id, subject_id, faculty_user_id, starts_at, ends_at, status')
      .eq('faculty_user_id', req.profile.id)
      .eq('subject_id', body.subjectId)
      .eq('status', 'active')
      .gt('ends_at', now)
      .order('starts_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingError) return respondSupabaseError(res, existingError)
    if (existingSession) {
      return res.json({ session: existingSession })
    }

    const startsAt = new Date()
    const endsAt = new Date(startsAt.getTime() + 15 * 60 * 1000)

    const { data: session, error } = await admin
      .from('sessions')
      .insert({
        subject_id: body.subjectId,
        faculty_user_id: req.profile.id,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status: 'active',
        duration_minutes: 15,
      })
      .select('id, subject_id, faculty_user_id, starts_at, ends_at, status')
      .single()

    if (error) return respondSupabaseError(res, error, 400)

    return res.status(201).json({ session })
  } catch (err) {
    return next(err)
  }
}

async function end(req, res, next) {
  try {
    const id = req.params.id
    const admin = getSupabaseAdmin()

    const { data: session, error: sError } = await admin
      .from('sessions')
      .select('id, subject_id, faculty_user_id, starts_at, ends_at, status')
      .eq('id', id)
      .maybeSingle()

    if (sError) return respondSupabaseError(res, sError)
    if (!session) return res.status(404).json({ error: 'Session not found' })
    if (session.faculty_user_id !== req.profile.id) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    if (session.status === 'ended') {
      return res.status(400).json({ error: 'Session already ended' })
    }

    const endedAt = nowIso()

    const { error: updateError } = await admin
      .from('sessions')
      .update({
        status: 'ended',
        ended_at: endedAt,
      })
      .eq('id', id)

    if (updateError) return respondSupabaseError(res, updateError, 400)

    // Get present student IDs (not just a count)
    const { data: presentRows, error: pError } = await admin
      .from('attendance')
      .select('student_user_id')
      .eq('session_id', id)

    if (pError) return respondSupabaseError(res, pError)

    const presentIdSet = new Set((presentRows || []).map((r) => r.student_user_id))

    // Registered students: all timetable entries for this subject (any date)
    const { data: ttRows, error: ttError } = await admin
      .from('timetable')
      .select('student_user_id')
      .eq('subject_id', session.subject_id)

    if (ttError) return respondSupabaseError(res, ttError)

    const registeredIdSet = new Set((ttRows || []).map((r) => r.student_user_id))

    // Fallback: if no timetable entries exist for the subject, use all students
    if (registeredIdSet.size === 0) {
      const { data: allStudents, error: asError } = await admin
        .from('users')
        .select('id')
        .eq('role', 'student')
      if (asError) return respondSupabaseError(res, asError)
      for (const s of allStudents || []) registeredIdSet.add(s.id)
    }

    // Ensure every present student is counted in the total
    for (const pid of presentIdSet) registeredIdSet.add(pid)

    const totalStudents = registeredIdSet.size
    const present = presentIdSet.size
    const absent = totalStudents - present
    const attendancePercent = totalStudents > 0 ? Math.round((present / totalStudents) * 100) : 0

    await admin
      .from('sessions')
      .update({
        present_count: present,
        absent_count: absent,
        attendance_percent: attendancePercent,
      })
      .eq('id', id)

    // Increment subject lecture counter (RPC defined in schema.sql).
    const { error: rpcError } = await admin.rpc('increment_subject_lectures', {
      subject_id: session.subject_id,
    })

    // RPC is non-critical for ending session; don't fail the request.
    if (rpcError) {
      // eslint-disable-next-line no-console
      console.warn('increment_subject_lectures RPC failed', rpcError)
    }

    // Fetch student details for the response
    const allIds = [...registeredIdSet]
    const studentDetails = new Map()
    if (allIds.length) {
      const { data: stuData } = await admin
        .from('users')
        .select('id, college_id, name')
        .in('id', allIds)
      for (const s of stuData || []) {
        studentDetails.set(s.id, { college_id: s.college_id, name: s.name })
      }
    }

    const presentStudents = [...presentIdSet].map(
      (id) => studentDetails.get(id) || { college_id: id },
    )
    const absentStudents = [...registeredIdSet]
      .filter((id) => !presentIdSet.has(id))
      .map((id) => studentDetails.get(id) || { college_id: id })

    return res.json({
      totalStudents,
      present,
      absent,
      attendancePercent,
      presentStudents,
      absentStudents,
    })
  } catch (err) {
    return next(err)
  }
}

async function active(req, res, next) {
  try {
    const admin = getSupabaseAdmin()
    const now = nowIso()

    const { data, error } = await admin
      .from('sessions')
      .select('id, subject_id, starts_at, ends_at, status, subjects(code)')
      .eq('faculty_user_id', req.profile.id)
      .eq('status', 'active')
      .gt('ends_at', now)
      .order('starts_at', { ascending: false })

    if (error) return respondSupabaseError(res, error)

    return res.json({
      sessions: (data || []).map((s) => ({
        id: s.id,
        subject_id: s.subject_id,
        subject_code: s.subjects?.code,
        starts_at: s.starts_at,
        ends_at: s.ends_at,
        status: s.status,
      })),
    })
  } catch (err) {
    return next(err)
  }
}

async function results(req, res, next) {
  try {
    const admin = getSupabaseAdmin()

    let from = req.query.from
    let to = req.query.to
    const date = req.query.date || isoDate(new Date())

    if (!from || !to) {
      from = `${date}T00:00:00.000Z`
      to = `${date}T23:59:59.999Z`
    }

    const { data, error } = await admin
      .from('sessions')
      .select(
        'id, subject_id, starts_at, ends_at, duration_minutes, subjects(code)',
      )
      .eq('faculty_user_id', req.profile.id)
      .eq('status', 'ended')
      .gte('starts_at', from)
      .lte('starts_at', to)
      .order('starts_at', { ascending: false })

    if (error) return respondSupabaseError(res, error)

    if (!data || !data.length) {
      return res.json({ sessions: [] })
    }

    const sessionIds = data.map((s) => s.id)
    const subjectIds = [...new Set(data.map((s) => s.subject_id))]

    // Batch-fetch attendance for all sessions
    const { data: attData, error: attError } = await admin
      .from('attendance')
      .select('session_id, student_user_id')
      .in('session_id', sessionIds)

    if (attError) return respondSupabaseError(res, attError)

    // Batch-fetch timetable entries for involved subjects (all dates)
    const { data: ttData, error: ttError } = await admin
      .from('timetable')
      .select('subject_id, student_user_id')
      .in('subject_id', subjectIds)

    if (ttError) return respondSupabaseError(res, ttError)

    // Per-subject registered student sets
    const registeredBySubject = new Map()
    for (const sid of subjectIds) {
      const ids = (ttData || [])
        .filter((r) => r.subject_id === sid)
        .map((r) => r.student_user_id)
      registeredBySubject.set(sid, new Set(ids))
    }

    // For subjects with no timetable entries, fall back to all students
    const needAll = subjectIds.some((sid) => registeredBySubject.get(sid).size === 0)
    if (needAll) {
      const { data: stuData } = await admin.from('users').select('id').eq('role', 'student')
      const allIds = new Set((stuData || []).map((r) => r.id))
      for (const sid of subjectIds) {
        if (registeredBySubject.get(sid).size === 0) {
          registeredBySubject.set(sid, new Set(allIds))
        }
      }
    }

    // Per-session present student sets
    const presentBySession = new Map()
    for (const row of attData || []) {
      if (!presentBySession.has(row.session_id)) {
        presentBySession.set(row.session_id, new Set())
      }
      presentBySession.get(row.session_id).add(row.student_user_id)
    }

    // Collect all student IDs for detail lookup
    const allIdSet = new Set()
    for (const [, ids] of registeredBySubject) for (const id of ids) allIdSet.add(id)
    for (const [, ids] of presentBySession) for (const id of ids) allIdSet.add(id)

    const studentDetails = new Map()
    if (allIdSet.size > 0) {
      const { data: stuData } = await admin
        .from('users')
        .select('id, college_id, name')
        .in('id', [...allIdSet])
      for (const s of stuData || []) {
        studentDetails.set(s.id, { college_id: s.college_id, name: s.name })
      }
    }

    const sessions = data.map((s) => {
      const presentIds = presentBySession.get(s.id) || new Set()
      const registered = new Set(registeredBySubject.get(s.subject_id) || [])

      // Ensure every present student is counted in total
      for (const pid of presentIds) registered.add(pid)

      const total = registered.size
      const presentCount = presentIds.size
      const absentCount = total - presentCount
      const pct = total > 0 ? Math.round((presentCount / total) * 100) : 0

      const presentStudents = [...presentIds].map(
        (id) => studentDetails.get(id) || { college_id: id },
      )
      const absentStudents = [...registered]
        .filter((id) => !presentIds.has(id))
        .map((id) => studentDetails.get(id) || { college_id: id })

      return {
        id: s.id,
        date: String(s.starts_at || '').slice(0, 10),
        subject_code: s.subjects?.code,
        duration_minutes: s.duration_minutes,
        total,
        present: presentCount,
        absent: absentCount,
        attendance_percent: pct,
        present_students: presentStudents,
        absent_students: absentStudents,
      }
    })

    return res.json({ sessions })
  } catch (err) {
    return next(err)
  }
}

module.exports = { start, end, active, results }
