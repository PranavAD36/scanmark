const { getSupabaseAdmin } = require('../lib/supabase')
const { respondSupabaseError } = require('../lib/supabaseError')

function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

async function dashboard(req, res, next) {
  try {
    const admin = getSupabaseAdmin()
    const today = isoDate(new Date())

    const { data: timetable, error: ttError } = await admin
      .from('timetable')
      .select('id, subject_id')
      .eq('student_user_id', req.profile.id)
      .eq('date', today)

    if (ttError) return respondSupabaseError(res, ttError)

    const subjectIds = Array.from(new Set((timetable || []).map((t) => t.subject_id)))

    const { data: sessionsToday, error: sError } = await admin
      .from('sessions')
      .select('id, subject_id')
      .eq('status', 'ended')
      .gte('starts_at', `${today}T00:00:00.000Z`)
      .lte('starts_at', `${today}T23:59:59.999Z`)
      .in('subject_id', subjectIds.length ? subjectIds : ['00000000-0000-0000-0000-000000000000'])

    if (sError) return respondSupabaseError(res, sError)

    const sessionIdsToday = sessionsToday.map((s) => s.id)

    const { data: attendanceToday, error: aError } = await admin
      .from('attendance')
      .select('id, session_id')
      .eq('student_user_id', req.profile.id)
      .eq('status', 'present')
      .in('session_id', sessionIdsToday.length ? sessionIdsToday : ['00000000-0000-0000-0000-000000000000'])

    if (aError) return respondSupabaseError(res, aError)

    const todayPresent = attendanceToday.length
    const todayAbsent = Math.max(0, sessionsToday.length - todayPresent)

    // Overall % based on ended sessions for subjects in student's timetable (all dates)
    const { data: subjRows, error: subjError } = await admin
      .from('timetable')
      .select('subject_id')
      .eq('student_user_id', req.profile.id)

    if (subjError) return respondSupabaseError(res, subjError)

    const allSubjectIds = Array.from(new Set((subjRows || []).map((r) => r.subject_id)))

    const { count: totalSessionsCount, error: totalError } = await admin
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ended')
      .in('subject_id', allSubjectIds.length ? allSubjectIds : ['00000000-0000-0000-0000-000000000000'])

    if (totalError) return respondSupabaseError(res, totalError)

    const total = totalSessionsCount || 0

    const { count: presentSessionsCount, error: presentError } = await admin
      .from('attendance')
      .select('id, sessions!inner(status)', { count: 'exact', head: true })
      .eq('student_user_id', req.profile.id)
      .eq('status', 'present')
      .eq('sessions.status', 'ended')
      .in('subject_id', allSubjectIds.length ? allSubjectIds : ['00000000-0000-0000-0000-000000000000'])

    if (presentError) return respondSupabaseError(res, presentError)

    const present = presentSessionsCount || 0
    const overallPercent = total > 0 ? Math.round((present / total) * 100) : 0

    return res.json({ todayPresent, todayAbsent, overallPercent })
  } catch (err) {
    return next(err)
  }
}

module.exports = { dashboard }
