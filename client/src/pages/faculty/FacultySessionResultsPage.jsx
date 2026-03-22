import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

function todayISO() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

export function FacultySessionResultsPage() {
  const [date, setDate] = useState(todayISO())
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const res = await api.get('/sessions/results', { params: { date } })
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

      <div className="sm-table-wrap">
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
