import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

export function AdminSubjectsPage() {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [facultyUserId, setFacultyUserId] = useState('')

  const [rows, setRows] = useState([])
  const [facultyList, setFacultyList] = useState([])
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const [editSubject, setEditSubject] = useState(null)
  const [editForm, setEditForm] = useState({ code: '', name: '', facultyUserId: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setError('')
    try {
      const [subRes, facRes] = await Promise.all([
        api.get('/subjects'),
        api.get('/admin/faculty'),
      ])
      setRows(subRes.data.subjects)
      setFacultyList(facRes.data.faculty || [])
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
      await api.post('/subjects', {
        code,
        name,
        facultyUserId: facultyUserId || null,
      })
      setStatus('Subject created.')
      setCode('')
      setName('')
      setFacultyUserId('')
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

  const openEdit = (subject) => {
    setEditSubject(subject)
    setEditForm({
      code: subject.code || '',
      name: subject.name || '',
      facultyUserId: subject.faculty_user_id || '',
    })
    setError('')
  }

  const saveEdit = async () => {
    if (!editSubject) return
    setSaving(true)
    setError('')
    try {
      await api.put(`/subjects/${editSubject.id}`, {
        code: editForm.code,
        name: editForm.name,
        facultyUserId: editForm.facultyUserId || null,
      })
      setEditSubject(null)
      await load()
    } catch (e) {
      setError(e?.response?.data?.error || e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sm-page">
      <div>
        <div className="sm-page-title">Manage Subjects</div>
        <div className="sm-page-subtitle">Create, edit, and assign faculty to subjects.</div>
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
            <label className="block text-sm font-medium text-gray-700">Assign Faculty</label>
            <select
              value={facultyUserId}
              onChange={(e) => setFacultyUserId(e.target.value)}
              className="mt-1 sm-select"
            >
              <option value="">— None —</option>
              {facultyList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.faculty_id} — {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {status ? <div className="mt-3 text-sm text-green-700">{status}</div> : null}
        {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}

        <div className="mt-4 flex gap-2">
          <button className="sm-btn-primary">Add subject</button>
          <button type="button" onClick={load} className="sm-btn-outline">
            Refresh
          </button>
        </div>
      </form>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {rows.length ? (
          rows.map((s) => (
            <div key={s.id} className="sm-card sm-card-body space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900">{s.code}</span>
                <span className="text-xs text-slate-500">{s.faculty_name || s.faculty_id || 'Unassigned'}</span>
              </div>
              <div className="text-sm text-slate-700">{s.name}</div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => openEdit(s)} className="sm-btn-outline px-2 py-1 text-xs">
                  Edit
                </button>
                <button
                  onClick={() => onDelete(s.id)}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-slate-500">No subjects.</div>
        )}
      </div>

      {/* Desktop table view */}
      <div className="sm-table-wrap hidden md:block">
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
                    <td className="sm-td">
                      {s.faculty_name
                        ? `${s.faculty_id} — ${s.faculty_name}`
                        : s.faculty_id || '—'}
                    </td>
                    <td className="sm-td text-right space-x-2">
                      <button
                        onClick={() => openEdit(s)}
                        className="sm-btn-outline px-2 py-1 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(s.id)}
                        className="text-xs text-red-600 hover:text-red-800"
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

      {/* Edit Modal */}
      {editSubject ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setEditSubject(null)}
        >
          <div
            className="sm-card sm-card-body w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-semibold text-slate-900">Edit Subject</div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Code</label>
                <input
                  value={editForm.code}
                  onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value }))}
                  className="mt-1 sm-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 sm-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Assign Faculty</label>
                <select
                  value={editForm.facultyUserId}
                  onChange={(e) => setEditForm((f) => ({ ...f, facultyUserId: e.target.value }))}
                  className="mt-1 sm-select"
                >
                  <option value="">— None —</option>
                  {facultyList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.faculty_id} — {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setEditSubject(null)}
                className="sm-btn-outline px-4 py-2"
                disabled={saving}
              >
                Cancel
              </button>
              <button onClick={saveEdit} className="sm-btn-primary px-4 py-2" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
