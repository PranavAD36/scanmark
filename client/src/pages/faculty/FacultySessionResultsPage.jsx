import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

function todayLocal() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function localDateToUTCRange(dateStr) {
  const from = new Date(dateStr + 'T00:00:00').toISOString()
  const to = new Date(dateStr + 'T23:59:59.999').toISOString()
  return { from, to }
}

function StudentBadges({ label, students, color }) {
  if (!students?.length) return null
  return (
    <div>
      <div className={`text-xs font-semibold mb-1 ${color}`}>
        {label} ({students.length})
      </div>
      <div className="flex flex-wrap gap-1">
        {students.map((s, i) => (
          <span
            key={i}
            className="text-xs bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5"
          >
            {s.college_id || s.name || '—'}
          </span>
        ))}
      </div>
    </div>
  )
}

export function FacultySessionResultsPage() {
  const [date, setDate] = useState(todayLocal())
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(new Set())

  const toggleExpand = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const load = useCallback(async () => {
    setError('')
    try {
      const { from, to } = localDateToUTCRange(date)
      const res = await api.get('/sessions/results', { params: { from, to } })
      setRows(res.data.sessions)
    } catch (e) {
      setError(e?.response?.data?.error || e.message)
    }
  }, [date])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="sm-page">
      <div>
        <div className="sm-page-title">Session Results</div>
        <div className="sm-page-subtitle">Ended sessions with attendance breakdown.</div>
      </div>

      <div className="sm-card sm-card-body flex flex-col md:flex-row md:items-end gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 sm-input"
          />
        </div>
        <button
          onClick={load}
          className="sm-btn-primary"
        >
          Load
        </button>
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {rows.length ? (
          rows.map((s) => {
            const isOpen = expanded.has(s.id)
            return (
              <div key={s.id} className="sm-card sm-card-body space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">{s.subject_code}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                    {s.attendance_percent}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <div className="text-xs text-slate-500">Present</div>
                    <div className="font-medium text-green-700">
                      {s.present}/{s.total}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Absent</div>
                    <div className="font-medium text-red-700">{s.absent}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Total</div>
                    <div className="font-medium">{s.total}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  {s.duration_minutes} min &middot; {s.date}
                </div>
                <button
                  onClick={() => toggleExpand(s.id)}
                  className="text-xs text-blue-600 font-medium"
                >
                  {isOpen ? 'Hide Students' : 'Show Students'}
                </button>
                {isOpen ? (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <StudentBadges
                      label="Present"
                      students={s.present_students}
                      color="text-green-700"
                    />
                    <StudentBadges
                      label="Absent"
                      students={s.absent_students}
                      color="text-red-700"
                    />
                  </div>
                ) : null}
              </div>
            )
          })
        ) : (
          <div className="text-sm text-slate-500">No sessions.</div>
        )}
      </div>

      {/* Desktop table view */}
      <div className="sm-table-wrap hidden md:block">
        <div className="overflow-auto">
          <table className="sm-table">
            <thead className="sm-thead">
              <tr>
                <th className="sm-th">Date</th>
                <th className="sm-th">Subject</th>
                <th className="sm-th">Duration</th>
                <th className="sm-th text-right">Total</th>
                <th className="sm-th text-right">Present</th>
                <th className="sm-th text-right">Absent</th>
                <th className="sm-th text-right">%</th>
                <th className="sm-th"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((s) => {
                  const isOpen = expanded.has(s.id)
                  return (
                    <tr key={s.id} className="sm-tr align-top">
                      <td className="sm-td">{s.date}</td>
                      <td className="sm-td">{s.subject_code}</td>
                      <td className="sm-td">{s.duration_minutes} min</td>
                      <td className="sm-td text-right">{s.total}</td>
                      <td className="sm-td text-right">{s.present}/{s.total}</td>
                      <td className="sm-td text-right">{s.absent}</td>
                      <td className="sm-td text-right">{s.attendance_percent}%</td>
                      <td className="sm-td">
                        <button
                          onClick={() => toggleExpand(s.id)}
                          className="text-xs text-blue-600 font-medium whitespace-nowrap"
                        >
                          {isOpen ? 'Hide' : 'Details'}
                        </button>
                        {isOpen ? (
                          <div className="mt-2 space-y-2 min-w-[200px]">
                            <StudentBadges
                              label="Present"
                              students={s.present_students}
                              color="text-green-700"
                            />
                            <StudentBadges
                              label="Absent"
                              students={s.absent_students}
                              color="text-red-700"
                            />
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td className="sm-empty" colSpan={8}>
                    No sessions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
