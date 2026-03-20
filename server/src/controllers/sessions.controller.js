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

    const { count: presentCount, error: pError } = await admin
      .from('attendance')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', id)

    if (pError) return respondSupabaseError(res, pError)

    const date = isoDate(new Date(session.starts_at))
    const { data: ttRows, error: ttError } = await admin
      .from('timetable')
      .select('student_user_id')
      .eq('subject_id', session.subject_id)
      .eq('date', date)

    if (ttError) return respondSupabaseError(res, ttError)

    const totalStudents = new Set((ttRows || []).map((r) => r.student_user_id)).size

    const present = presentCount || 0
    const absent = Math.max(0, totalStudents - present)
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
    await admin
      .rpc('increment_subject_lectures', { subject_id: session.subject_id })
      .catch(() => {})

    return res.json({ present, absent, attendancePercent })
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
    const date = req.query.date || isoDate(new Date())
    const admin = getSupabaseAdmin()

    const { data, error } = await admin
      .from('sessions')
      .select(
        'id, starts_at, ends_at, duration_minutes, present_count, absent_count, attendance_percent, subjects(code)',
      )
      .eq('faculty_user_id', req.profile.id)
      .eq('status', 'ended')
      .gte('starts_at', `${date}T00:00:00.000Z`)
      .lte('starts_at', `${date}T23:59:59.999Z`)
      .order('starts_at', { ascending: false })

    if (error) return respondSupabaseError(res, error)

    const sessions = (data || []).map((s) => ({
      id: s.id,
      date,
      subject_code: s.subjects?.code,
      duration_minutes: s.duration_minutes,
      present: s.present_count || 0,
      absent: s.absent_count || 0,
      attendance_percent: s.attendance_percent || 0,
    }))

    return res.json({ sessions })
  } catch (err) {
    return next(err)
  }
}

module.exports = { start, end, active, results }
