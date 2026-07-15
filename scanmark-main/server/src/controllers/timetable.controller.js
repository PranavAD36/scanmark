const { z } = require('zod')
const { getSupabaseAdmin } = require('../lib/supabase')
const { respondSupabaseError } = require('../lib/supabaseError')

async function listForStudent(req, res, next) {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10)
    const admin = getSupabaseAdmin()

    const { data, error } = await admin
      .from('timetable')
      .select('id, date, start_time, end_time, room, subjects(code)')
      .eq('student_user_id', req.profile.id)
      .eq('date', date)
      .order('start_time', { ascending: true })

    if (error) return respondSupabaseError(res, error)

    const items = (data || []).map((t) => ({
      id: t.id,
      date: t.date,
      start_time: t.start_time,
      end_time: t.end_time,
      room: t.room,
      subject_code: t.subjects?.code,
    }))

    return res.json({ items })
  } catch (err) {
    return next(err)
  }
}

async function upsertItem(req, res, next) {
  try {
    const body = z
      .object({
        studentCollegeId: z.string().min(1),
        subjectId: z.string().uuid(),
        date: z.string().min(10),
        startTime: z.string().min(4),
        endTime: z.string().min(4),
        room: z.string().optional().nullable(),
      })
      .parse(req.body)

    const admin = getSupabaseAdmin()

    const { data: student, error: sError } = await admin
      .from('users')
      .select('id')
      .eq('role', 'student')
      .eq('college_id', body.studentCollegeId)
      .maybeSingle()

    if (sError) return respondSupabaseError(res, sError)
    if (!student) return res.status(404).json({ error: 'Student not found' })

    const { data, error } = await admin
      .from('timetable')
      .upsert(
        {
          student_user_id: student.id,
          subject_id: body.subjectId,
          date: body.date,
          start_time: body.startTime,
          end_time: body.endTime,
          room: body.room || null,
        },
        {
          onConflict: 'student_user_id,subject_id,date,start_time',
        },
      )
      .select('id')
      .single()

    if (error) return respondSupabaseError(res, error, 400)

    return res.status(201).json({ id: data.id })
  } catch (err) {
    return next(err)
  }
}

module.exports = { listForStudent, upsertItem }
