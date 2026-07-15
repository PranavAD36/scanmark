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

export function StudentAttendanceRecordsPage() {
  const [date, setDate] = useState(todayLocal())
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const { from, to } = localDateToUTCRange(date)
      const res = await api.get('/attendance/records', { params: { from, to } })
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
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {rows.length ? (
          rows.map((r) => (
            <div key={r.id} className="sm-card sm-card-body space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900">{r.subject_code}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  r.status === 'present' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>{r.status}</span>
              </div>
              <div className="text-xs text-slate-500">{new Date(r.scanned_at).toLocaleString()}</div>
            </div>
          ))
        ) : (
          <div className="text-sm text-slate-500">No records.</div>
        )}
      </div>

      {/* Desktop table view */}
      <div className="sm-table-wrap hidden md:block">
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
