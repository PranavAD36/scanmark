const { getSupabaseAdmin } = require('../lib/supabase')
const { respondSupabaseError } = require('../lib/supabaseError')

function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

async function dashboard(req, res, next) {
  try {
    const admin = getSupabaseAdmin()
    const today = isoDate(new Date())

    const { data: sessions, error } = await admin
      .from('sessions')
      .select('id, starts_at, ends_at, status, subjects(code)')
      .eq('faculty_user_id', req.profile.id)
      .gte('starts_at', `${today}T00:00:00.000Z`)
      .lte('starts_at', `${today}T23:59:59.999Z`)
      .order('starts_at', { ascending: true })

    if (error) return respondSupabaseError(res, error)

    const todayLectures = sessions.length
    const completedLectures = sessions.filter((s) => s.status === 'ended').length
    const remainingLectures = todayLectures - completedLectures

    return res.json({
      todayLectures,
      completedLectures,
      remainingLectures,
      sessions: sessions.map((s) => ({
        id: s.id,
        starts_at: s.starts_at,
        ends_at: s.ends_at,
        status: s.status,
        subject_code: s.subjects?.code,
      })),
    })
  } catch (err) {
    return next(err)
  }
}

module.exports = { dashboard }
