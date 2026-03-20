import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

function StatCard({ label, value }) {
  return (
    <div className="sm-card sm-card-body">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">
        {value ?? '—'}
      </div>
    </div>
  )
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    api
      .get('/admin/stats')
      .then((res) => mounted && setStats(res.data))
      .catch((e) => mounted && setError(e?.response?.data?.error || e.message))
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="sm-page">
      <div>
        <div className="sm-page-title">Admin Dashboard</div>
        <div className="sm-page-subtitle">Quick system stats.</div>
      </div>

      {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Students" value={stats?.students} />
        <StatCard label="Faculty" value={stats?.faculty} />
        <StatCard label="Subjects" value={stats?.subjects} />
        <StatCard label="Sessions Today" value={stats?.sessionsToday} />
      </div>
    </div>
  )
}
