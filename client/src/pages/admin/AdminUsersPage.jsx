import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

export function AdminUsersPage() {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      const res = await api.get('/admin/users')
      setRows(res.data.users)
    } catch (e) {
      setError(e?.response?.data?.error || e.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="sm-page">
      <div>
        <div className="sm-page-title">Manage Users</div>
        <div className="sm-page-subtitle">Read-only list (roles are set at creation).</div>
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="sm-table-wrap">
        <div className="sm-card-header justify-end">
          <button
            onClick={load}
            className="sm-btn-outline px-3 py-1.5"
          >
            Refresh
          </button>
        </div>
        <div className="overflow-auto">
        <table className="sm-table">
          <thead className="sm-thead">
            <tr>
              <th className="sm-th">College ID</th>
              <th className="sm-th">Name</th>
              <th className="sm-th">Email</th>
              <th className="sm-th">Role</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((u) => (
                <tr key={u.id} className="sm-tr">
                  <td className="sm-td">{u.college_id || u.faculty_id || '—'}</td>
                  <td className="sm-td">{u.name}</td>
                  <td className="sm-td">{u.email}</td>
                  <td className="sm-td">{u.role}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="sm-empty" colSpan={4}>
                  No users.
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
