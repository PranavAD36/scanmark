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

export function FacultySessionResultsPage() {
  const [date, setDate] = useState(todayLocal())
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')

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
            const total = s.total ?? (Number(s.present || 0) + Number(s.absent || 0))
            return (
              <div key={s.id} className="sm-card sm-card-body space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">{s.subject_code}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{s.attendance_percent}%</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div><div className="text-xs text-slate-500">Present</div><div className="font-medium text-green-700">{s.present}</div></div>
                  <div><div className="text-xs text-slate-500">Absent</div><div className="font-medium text-red-700">{s.absent}</div></div>
                  <div><div className="text-xs text-slate-500">Total</div><div className="font-medium">{total}</div></div>
                </div>
                <div className="text-xs text-slate-500">{s.duration_minutes} min &middot; {s.date}</div>
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
              <th className="sm-th">Session ID</th>
              <th className="sm-th">Duration</th>
              <th className="sm-th text-right">Total</th>
              <th className="sm-th text-right">Present</th>
              <th className="sm-th text-right">Absent</th>
              <th className="sm-th text-right">Attendance %</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((s) => {
                const total = s.total ?? (Number(s.present || 0) + Number(s.absent || 0))
                return (
                  <tr key={s.id} className="sm-tr">
                    <td className="sm-td">{s.date}</td>
                    <td className="sm-td">{s.subject_code}</td>
                    <td className="sm-td">{s.id}</td>
                    <td className="sm-td">{s.duration_minutes} min</td>
                    <td className="sm-td text-right">{total}</td>
                    <td className="sm-td text-right">{s.present}/{total}</td>
                    <td className="sm-td text-right">{s.absent}</td>
                    <td className="sm-td text-right">{s.attendance_percent}%</td>
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
