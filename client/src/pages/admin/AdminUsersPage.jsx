import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

const TABS = ['Students', 'Faculty']

export function AdminUsersPage() {
  const [tab, setTab] = useState('Students')
  const [students, setStudents] = useState([])
  const [faculty, setFaculty] = useState([])
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      const res = await api.get('/admin/users')
      const users = res.data.users || []
      setStudents(users.filter((u) => u.role === 'student'))
      setFaculty(users.filter((u) => u.role === 'faculty'))
    } catch (e) {
      setError(e?.response?.data?.error || e.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const rows = tab === 'Students' ? students : faculty

  return (
    <div className="sm-page">
      <div>
        <div className="sm-page-title">Manage Users</div>
        <div className="sm-page-subtitle">View students and faculty separately.</div>
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="flex items-center gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              tab === t
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            {t} ({t === 'Students' ? students.length : faculty.length})
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={load} className="sm-btn-outline px-3 py-1.5 text-sm">
          Refresh
        </button>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {rows.length ? (
          rows.map((u) => (
            <div key={u.id} className="sm-card sm-card-body space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900">{u.name}</span>
                <span className="text-xs text-slate-500">
                  {tab === 'Students' ? u.college_id : u.faculty_id || '—'}
                </span>
              </div>
              <div className="text-xs text-slate-500">{u.email}</div>
            </div>
          ))
        ) : (
          <div className="text-sm text-slate-500">No {tab.toLowerCase()}.</div>
        )}
      </div>

      {/* Desktop table view */}
      <div className="sm-table-wrap hidden md:block">
        <div className="overflow-auto">
          <table className="sm-table">
            <thead className="sm-thead">
              <tr>
                <th className="sm-th">{tab === 'Students' ? 'College ID' : 'Faculty ID'}</th>
                <th className="sm-th">Name</th>
                <th className="sm-th">Email</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((u) => (
                  <tr key={u.id} className="sm-tr">
                    <td className="sm-td">
                      {tab === 'Students' ? u.college_id : u.faculty_id || '—'}
                    </td>
                    <td className="sm-td">{u.name}</td>
                    <td className="sm-td">{u.email}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="sm-empty" colSpan={3}>
                    No {tab.toLowerCase()}.
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
