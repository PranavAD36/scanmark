import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

export function StudentDashboardPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const loading = !error && data === null

  useEffect(() => {
    let mounted = true
    api
      .get('/attendance/summary')
      .then((res) => mounted && setData(res.data))
      .catch((e) => mounted && setError(e?.response?.data?.error || e.message))
    return () => {
      mounted = false
    }
  }, [])

  const subjects = data?.subjects || []
  const overallPercent = data?.overallPercent ?? 0

  return (
    <div className="sm-page">
      <div>
        <div className="sm-page-title">Student Dashboard</div>
        <div className="sm-page-subtitle">Overall and subject-wise attendance.</div>
      </div>

      {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}
      {loading ? <div className="mt-4 text-sm text-slate-600">Loading...</div> : null}

      <div className="mt-6 grid grid-cols-1 gap-4">
        <div className="sm-card sm-card-body">
          <div className="text-xs text-slate-500">Overall attendance</div>
          <div className="mt-1 text-3xl font-semibold text-slate-900">
            {loading ? '—' : `${overallPercent}%`}
          </div>
        </div>
      </div>

      <div className="sm-table-wrap">
        <div className="sm-card-header">
          <div className="sm-card-title">By subject</div>
        </div>

        {/* Mobile card view */}
        <div className="md:hidden p-3 space-y-3">
          {subjects.length ? (
            subjects.map((s) => (
              <div key={s.subject_id} className="border border-slate-200 rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-900">{s.subject_code || '—'}</div>
                    {s.subject_name ? <div className="text-xs text-slate-500">{s.subject_name}</div> : null}
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    Number(s.percent || 0) >= 75 ? 'bg-green-50 text-green-700' : Number(s.percent || 0) >= 50 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                  }`}>{Number(s.percent || 0)}%</span>
                </div>
                <div className="text-xs text-slate-500">{Number(s.present || 0)}/{Number(s.total || 0)} sessions</div>
              </div>
            ))
          ) : (
            <div className="text-sm text-slate-500 py-3">{loading ? 'Loading...' : 'No attendance data yet.'}</div>
          )}
        </div>

        {/* Desktop table view */}
        <div className="overflow-auto hidden md:block">
          <table className="sm-table">
            <thead className="sm-thead">
              <tr>
                <th className="sm-th">Course / Subject</th>
                <th className="sm-th">Class Type</th>
                <th className="sm-th text-right">Present/Total</th>
                <th className="sm-th text-right">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {subjects.length ? (
                subjects.map((s) => (
                  <tr key={s.subject_id} className="sm-tr">
                    <td className="sm-td">
                      <div className="font-medium text-slate-900">
                        {s.subject_code || '—'}
                      </div>
                      {s.subject_name ? (
                        <div className="text-xs text-slate-500">{s.subject_name}</div>
                      ) : null}
                    </td>
                    <td className="sm-td">—</td>
                    <td className="sm-td text-right">{Number(s.present || 0)}/{Number(s.total || 0)}</td>
                    <td className="sm-td text-right">{Number(s.percent || 0)}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="sm-empty" colSpan={4}>
                    {loading ? 'Loading...' : 'No attendance data yet.'}
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
