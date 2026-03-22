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

export function StudentDashboardPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const loading = !error && data === null

  useEffect(() => {
    let mounted = true
    api
      .get('/student/dashboard')
      .then((res) => mounted && setData(res.data))
      .catch((e) => mounted && setError(e?.response?.data?.error || e.message))
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="sm-page">
      <div>
        <div className="sm-page-title">Student Dashboard</div>
        <div className="sm-page-subtitle">Today and overall attendance.</div>
      </div>

      {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}
      {loading ? <div className="mt-4 text-sm text-slate-600">Loading...</div> : null}

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Today present" value={loading ? '—' : (data?.todayPresent ?? 0)} />
        <Stat label="Today absent" value={loading ? '—' : (data?.todayAbsent ?? 0)} />
        <Stat label="Overall %" value={loading ? '—' : (data?.overallPercent ?? 0)} />
      </div>
    </div>
  )
}
