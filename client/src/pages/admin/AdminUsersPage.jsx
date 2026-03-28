import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

const TABS = ['Students', 'Faculty']

export function AdminUsersPage() {
  const [tab, setTab] = useState('Students')
  const [students, setStudents] = useState([])
  const [faculty, setFaculty] = useState([])
  const [error, setError] = useState('')
  const [editUser, setEditUser] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', idField: '', password: '' })
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)

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
  const idLabel = tab === 'Students' ? 'College ID' : 'Faculty ID'

  const onDelete = async (user) => {
    if (!confirm(`Delete ${user.name}? This will remove the user and all associated data.`)) return
    setError('')
    try {
      await api.delete(`/admin/users/${user.id}`)
      await load()
    } catch (e) {
      setError(e?.response?.data?.error || e.message)
    }
  }

  const openEdit = (user) => {
    setEditUser(user)
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      idField: user.role === 'student' ? (user.college_id || '') : (user.faculty_id || ''),
      password: '',
    })
    setFormErrors({})
    setError('')
  }

  const validateEditForm = () => {
    const errs = {}
    if (!editForm.name.trim()) errs.name = 'Name is required'
    if (!editForm.email.trim()) {
      errs.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) {
      errs.email = 'Invalid email address'
    }
    if (!editForm.idField.trim()) errs.idField = `${editUser?.role === 'student' ? 'College' : 'Faculty'} ID is required`
    if (editForm.password && editForm.password.length < 8) {
      errs.password = 'Password must be at least 8 characters'
    }
    return errs
  }

  const saveEdit = async () => {
    if (!editUser) return
    const errs = validateEditForm()
    setFormErrors(errs)
    if (Object.keys(errs).length) return

    setSaving(true)
    setError('')
    try {
      const payload = { name: editForm.name, email: editForm.email }
      if (editUser.role === 'student') payload.collegeId = editForm.idField
      else payload.facultyId = editForm.idField
      if (editForm.password) payload.password = editForm.password
      await api.put(`/admin/users/${editUser.id}`, payload)
      setEditUser(null)
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
        <div className="sm-page-title">Manage Users</div>
        <div className="sm-page-subtitle">View, edit and delete students and faculty.</div>
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
            <div key={u.id} className="sm-card sm-card-body space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900">{u.name}</span>
                <span className="text-xs text-slate-500">
                  {tab === 'Students' ? u.college_id : u.faculty_id || '—'}
                </span>
              </div>
              <div className="text-xs text-slate-500">{u.email}</div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => openEdit(u)} className="sm-btn-outline px-2 py-1 text-xs">
                  Edit
                </button>
                <button
                  onClick={() => onDelete(u)}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
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
                <th className="sm-th">{idLabel}</th>
                <th className="sm-th">Name</th>
                <th className="sm-th">Email</th>
                <th className="sm-th text-right">Actions</th>
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
                    <td className="sm-td text-right space-x-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="sm-btn-outline px-2 py-1 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(u)}
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
                    No {tab.toLowerCase()}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editUser ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setEditUser(null)}
        >
          <div
            className="sm-card sm-card-body w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-semibold text-slate-900">
              Edit {editUser.role === 'student' ? 'Student' : 'Faculty'}
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">{idLabel}</label>
                <input
                  value={editForm.idField}
                  onChange={(e) => setEditForm((f) => ({ ...f, idField: e.target.value }))}
                  className="mt-1 sm-input"
                />
                {formErrors.idField ? <div className="text-xs text-red-600 mt-1">{formErrors.idField}</div> : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 sm-input"
                />
                {formErrors.name ? <div className="text-xs text-red-600 mt-1">{formErrors.name}</div> : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1 sm-input"
                  type="email"
                />
                {formErrors.email ? <div className="text-xs text-red-600 mt-1">{formErrors.email}</div> : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  New Password{' '}
                  <span className="text-xs text-slate-400">(leave blank to keep current)</span>
                </label>
                <input
                  value={editForm.password}
                  onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                  className="mt-1 sm-input"
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                />
                {formErrors.password ? <div className="text-xs text-red-600 mt-1">{formErrors.password}</div> : null}
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setEditUser(null)}
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
