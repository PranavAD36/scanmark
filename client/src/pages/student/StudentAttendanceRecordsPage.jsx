import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function StudentAttendanceRecordsPage() {
  const [date, setDate] = useState(todayISO())
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const res = await api.get('/attendance/records', { params: { date } })
      setRows(res.data.records)
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
        <div className="sm-page-title">Attendance Records</div>
        <div className="sm-page-subtitle">Default is today; pick another date to view.</div>
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
          className="w-full md:w-auto sm-btn-primary"
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
              <th className="sm-th">Subject</th>
              <th className="sm-th">Session</th>
              <th className="sm-th">Status</th>
              <th className="sm-th">Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((r) => (
                <tr key={r.id} className="sm-tr">
                  <td className="sm-td">{r.subject_code}</td>
                  <td className="sm-td break-all">{r.session_id}</td>
                  <td className="sm-td">{r.status}</td>
                  <td className="sm-td">{new Date(r.scanned_at).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="sm-empty" colSpan={4}>
                  No records.
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
