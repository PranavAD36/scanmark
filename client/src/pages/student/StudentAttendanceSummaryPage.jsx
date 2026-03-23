import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

export function StudentAttendanceSummaryPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

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

  return (
    <div className="sm-page">
      <div>
        <div className="sm-page-title">Attendance Summary</div>
        <div className="sm-page-subtitle">Subject-wise and overall.</div>
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="sm-card sm-card-body">
          <div className="text-xs text-slate-500">Overall %</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {data?.overallPercent ?? '—'}
          </div>
        </div>
      </div>

      <div className="sm-table-wrap">
        <div className="sm-card-header">
          <div className="sm-card-title">By subject</div>
        </div>

        {/* Mobile card view */}
        <div className="md:hidden p-3 space-y-3">
          {(data?.subjects || []).length ? (
            data.subjects.map((s) => (
              <div key={s.subject_id} className="border border-slate-200 rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">{s.subject_code}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    s.percent >= 75 ? 'bg-green-50 text-green-700' : s.percent >= 50 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                  }`}>{s.percent}%</span>
                </div>
                <div className="text-xs text-slate-500">{s.present} present / {s.total} total</div>
              </div>
            ))
          ) : (
            <div className="text-sm text-slate-500 py-3">No data.</div>
          )}
        </div>

        {/* Desktop table view */}
        <div className="overflow-auto hidden md:block">
        <table className="sm-table">
          <thead className="sm-thead">
            <tr>
              <th className="sm-th">Subject</th>
              <th className="sm-th text-right">Present</th>
              <th className="sm-th text-right">Total</th>
              <th className="sm-th text-right">%</th>
            </tr>
          </thead>
          <tbody>
            {(data?.subjects || []).length ? (
              data.subjects.map((s) => (
                <tr key={s.subject_id} className="sm-tr">
                  <td className="sm-td">{s.subject_code}</td>
                  <td className="sm-td text-right">{s.present}</td>
                  <td className="sm-td text-right">{s.total}</td>
                  <td className="sm-td text-right">{s.percent}%</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="sm-empty" colSpan={4}>
                  No data.
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
