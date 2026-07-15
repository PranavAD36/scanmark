import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

function Stat({ label, value }) {
  return (
    <div className="sm-card sm-card-body">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">
        {value ?? '—'}
      </div>
    </div>
  )
}

export function FacultyDashboardPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const loading = !error && data === null

  useEffect(() => {
    let mounted = true
    api
      .get('/faculty/dashboard')
      .then((res) => mounted && setData(res.data))
      .catch((e) => mounted && setError(e?.response?.data?.error || e.message))
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="sm-page">
      <div>
        <div className="sm-page-title">Faculty Dashboard</div>
        <div className="sm-page-subtitle">Today lectures overview.</div>
      </div>

      {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}
      {loading ? <div className="mt-4 text-sm text-slate-600">Loading...</div> : null}

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Today lectures" value={loading ? '—' : (data?.todayLectures ?? 0)} />
        <Stat label="Completed lectures" value={loading ? '—' : (data?.completedLectures ?? 0)} />
        <Stat label="Remaining lectures" value={loading ? '—' : (data?.remainingLectures ?? 0)} />
      </div>

      <div className="sm-table-wrap">
        <div className="sm-card-header">
          <div className="sm-card-title">Today sessions</div>
        </div>
        <div className="overflow-auto">
        <table className="sm-table">
          <thead className="sm-thead">
            <tr>
              <th className="sm-th">Subject</th>
              <th className="sm-th">Status</th>
              <th className="sm-th">Start</th>
              <th className="sm-th">End</th>
            </tr>
          </thead>
          <tbody>
            {(data?.sessions || []).length ? (
              data.sessions.map((s) => (
                <tr key={s.id} className="sm-tr">
                  <td className="sm-td">{s.subject_code}</td>
                  <td className="sm-td">{s.status}</td>
                  <td className="sm-td">{new Date(s.starts_at).toLocaleString()}</td>
                  <td className="sm-td">{new Date(s.ends_at).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="sm-empty" colSpan={4}>
                  No sessions today.
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
