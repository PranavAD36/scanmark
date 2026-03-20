import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

export function AdminSubjectsPage() {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [facultyId, setFacultyId] = useState('')

  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const load = async () => {
    setError('')
    try {
      const res = await api.get('/subjects')
      setRows(res.data.subjects)
    } catch (e) {
      setError(e?.response?.data?.error || e.message)
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
      await api.post('/subjects', { code, name, facultyId: facultyId || null })
      setStatus('Subject created.')
      setCode('')
      setName('')
      setFacultyId('')
      await load()
    } catch (e2) {
      setError(e2?.response?.data?.error || e2.message)
    }
  }

  const onDelete = async (id) => {
    if (!confirm('Delete this subject?')) return
    setError('')
    try {
      await api.delete(`/subjects/${id}`)
      await load()
    } catch (e) {
      setError(e?.response?.data?.error || e.message)
    }
  }

  return (
    <div className="sm-page">
      <div>
        <div className="sm-page-title">Manage Subjects</div>
        <div className="sm-page-subtitle">Create and list subjects.</div>
      </div>

      <form onSubmit={onSubmit} className="sm-card sm-card-body">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 sm-input"
              placeholder="CS301"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 sm-input"
              placeholder="Database Systems"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Faculty ID (optional)
            </label>
            <input
              value={facultyId}
              onChange={(e) => setFacultyId(e.target.value)}
              className="mt-1 sm-input"
              placeholder="FAC1001"
            />
          </div>
        </div>

        {status ? <div className="mt-3 text-sm text-green-700">{status}</div> : null}
        {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}

        <div className="mt-4 flex gap-2">
          <button className="sm-btn-primary">
            Add subject
          </button>
          <button
            type="button"
            onClick={load}
            className="sm-btn-outline"
          >
            Refresh
          </button>
        </div>
      </form>

      <div className="sm-table-wrap">
        <div className="overflow-auto">
        <table className="sm-table">
          <thead className="sm-thead">
            <tr>
              <th className="sm-th">Code</th>
              <th className="sm-th">Name</th>
              <th className="sm-th">Faculty</th>
              <th className="sm-th text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((s) => (
                <tr key={s.id} className="sm-tr">
                  <td className="sm-td">{s.code}</td>
                  <td className="sm-td">{s.name}</td>
                  <td className="sm-td">{s.faculty_id || '—'}</td>
                  <td className="sm-td text-right">
                    <button
                      onClick={() => onDelete(s.id)}
                      className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="sm-empty" colSpan={4}>
                  No subjects.
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
