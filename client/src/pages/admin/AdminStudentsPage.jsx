import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

export function AdminStudentsPage() {
  const [collegeId, setCollegeId] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/students')
      setRows(res.data.students)
    } catch (e) {
      setError(e?.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setStatus('')

    try {
      await api.post('/admin/students', {
        collegeId,
        name,
        email,
        password,
      })
      setStatus('Student created.')
      setCollegeId('')
      setName('')
      setEmail('')
      setPassword('')
      await load()
    } catch (e2) {
      setError(e2?.response?.data?.error || e2.message)
    }
  }

  return (
    <div className="sm-page">
      <div>
        <div className="sm-page-title">Add Student</div>
        <div className="sm-page-subtitle">Creates a Supabase auth user + student profile.</div>
      </div>

      <form onSubmit={onSubmit} className="sm-card sm-card-body">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              College ID
            </label>
            <input
              value={collegeId}
              onChange={(e) => setCollegeId(e.target.value)}
              className="mt-1 sm-input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 sm-input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 sm-input"
              type="email"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Temporary password
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 sm-input"
              type="password"
              minLength={8}
              required
            />
          </div>
        </div>

        {status ? <div className="mt-3 text-sm text-green-700">{status}</div> : null}
        {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}

        <div className="mt-4">
          <button className="sm-btn-primary">
            Create student
          </button>
        </div>
      </form>

      <div className="sm-table-wrap">
        <div className="sm-card-header">
          <div className="sm-card-title">Students</div>
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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="sm-empty" colSpan={3}>
                    Loading…
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((r) => (
                  <tr key={r.id} className="sm-tr">
                    <td className="sm-td">{r.college_id}</td>
                    <td className="sm-td">{r.name}</td>
                    <td className="sm-td">{r.email}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="sm-empty" colSpan={3}>
                    No students yet.
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
