const { z } = require('zod')
const { getSupabaseAdmin } = require('../lib/supabase')
const { respondSupabaseError } = require('../lib/supabaseError')

const REPORT_TYPES = {
  week: { days: 7 },
  month: { months: 1 },
  three_months: { months: 3 },
  year: { years: 1 },
}

function getDateRange(type) {
  const toDate = new Date()
  const fromDate = new Date(toDate)
  const config = REPORT_TYPES[type] || REPORT_TYPES.month

  if (config.days) fromDate.setDate(fromDate.getDate() - config.days)
  if (config.months) fromDate.setMonth(fromDate.getMonth() - config.months)
  if (config.years) fromDate.setFullYear(fromDate.getFullYear() - config.years)

  return {
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
  }
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

async function attendanceReport(req, res, next) {
  try {
    if (!['admin', 'faculty'].includes(req.profile.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const query = z
      .object({
        type: z.enum(['week', 'month', 'three_months', 'year']).default('month'),
        studentId: z.string().trim().optional(),
        belowPercent: z.coerce.number().min(0).max(100).optional(),
      })
      .parse(req.query)

    const admin = getSupabaseAdmin()
    const { from, to } = getDateRange(query.type)

    let sessionsQuery = admin
      .from('sessions')
      .select('id, subject_id, subjects(id, code, name)')
      .eq('status', 'ended')
      .gte('starts_at', from)
      .lte('starts_at', to)

    if (req.profile.role === 'faculty') {
      sessionsQuery = sessionsQuery.eq('faculty_user_id', req.profile.id)
    }

    const { data: sessions, error: sessionsError } = await sessionsQuery
    if (sessionsError) return respondSupabaseError(res, sessionsError)

    const sessionRows = sessions || []
    const sessionIds = sessionRows.map((session) => session.id)
    const subjectMap = new Map()

    for (const session of sessionRows) {
      if (!subjectMap.has(session.subject_id)) {
        subjectMap.set(session.subject_id, {
          id: session.subject_id,
          code: session.subjects?.code || 'Subject',
          name: session.subjects?.name || '',
        })
      }
    }

    if (!sessionIds.length) {
      return res.json({
        from,
        to,
        subjects: [],
        rows: [],
      })
    }

    let studentsQuery = admin
      .from('users')
      .select('id, college_id, name')
      .eq('role', 'student')
      .order('college_id', { ascending: true })

    if (query.studentId) {
      studentsQuery = isUuid(query.studentId)
        ? studentsQuery.eq('id', query.studentId)
        : studentsQuery.eq('college_id', query.studentId)
    }

    const { data: students, error: studentsError } = await studentsQuery
    if (studentsError) return respondSupabaseError(res, studentsError)

    const studentRows = students || []
    const studentIds = studentRows.map((student) => student.id)

    if (!studentIds.length) {
      return res.json({
        from,
        to,
        subjects: Array.from(subjectMap.values()),
        rows: [],
      })
    }

    const { data: attendanceRows, error: attendanceError } = await admin
      .from('attendance')
      .select('session_id, subject_id, student_user_id, status')
      .in('session_id', sessionIds)
      .in('student_user_id', studentIds)

    if (attendanceError) return respondSupabaseError(res, attendanceError)

    const totalsByStudentSubject = new Map()
    const presentByStudentSubject = new Map()
    const seenStudentSubjectSessions = new Set()
    const studentsWithRecords = new Set()

    // Build a map of all sessions by subject for total session count
    const sessionsBySubject = new Map()
    for (const session of sessionRows) {
      if (!sessionsBySubject.has(session.subject_id)) {
        sessionsBySubject.set(session.subject_id, [])
      }
      sessionsBySubject.get(session.subject_id).push(session.id)
    }

    // Initialize total session counts for each student-subject combination
    for (const student of studentRows) {
      for (const [subjectId, sessionsForSubject] of sessionsBySubject) {
        const key = `${student.id}:${subjectId}`
        totalsByStudentSubject.set(key, sessionsForSubject.length)
      }
    }

    for (const row of attendanceRows || []) {
      const uniqueKey = `${row.student_user_id}:${row.subject_id}:${row.session_id}`
      if (seenStudentSubjectSessions.has(uniqueKey)) continue
      seenStudentSubjectSessions.add(uniqueKey)

      studentsWithRecords.add(row.student_user_id)

      if (row.status === 'present') {
        const key = `${row.student_user_id}:${row.subject_id}`
        presentByStudentSubject.set(key, (presentByStudentSubject.get(key) || 0) + 1)
      }
    }

    let reportRows = studentRows
      .filter((student) => query.studentId || studentsWithRecords.has(student.id))
      .map((student) => {
        const percentages = {}
        let overallPresent = 0
        let overallTotal = 0

        for (const subject of subjectMap.values()) {
          const key = `${student.id}:${subject.id}`
          const total = totalsByStudentSubject.get(key) || 0
          const present = presentByStudentSubject.get(key) || 0

          percentages[subject.id] = total > 0 ? Math.round((present / total) * 100) : null
          overallPresent += present
          overallTotal += total
        }

        return {
          studentId: student.college_id || student.id,
          studentUserId: student.id,
          name: student.name,
          percentages,
          overallPercent: overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : 0,
        }
      })

    if (query.belowPercent !== undefined) {
      reportRows = reportRows.filter((row) => row.overallPercent < query.belowPercent)
    }

    return res.json({
      from,
      to,
      subjects: Array.from(subjectMap.values()),
      rows: reportRows,
    })
  } catch (err) {
    return next(err)
  }
}

module.exports = { attendanceReport }
