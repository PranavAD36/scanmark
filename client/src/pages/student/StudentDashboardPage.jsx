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

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Today present" value={data?.todayPresent} />
        <Stat label="Today absent" value={data?.todayAbsent} />
        <Stat label="Overall %" value={data?.overallPercent} />
      </div>
    </div>
  )
}
