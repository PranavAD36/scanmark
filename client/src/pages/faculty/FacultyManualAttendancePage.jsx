import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api.js'

export function FacultyManualAttendancePage() {
  const [activeSessions, setActiveSessions] = useState([])
  const [sessionId, setSessionId] = useState('')
  const [studentId, setStudentId] = useState('')

  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const loadSessions = useCallback(async () => {
    setError('')
    try {
      const res = await api.get('/sessions/active')
      setActiveSessions(res.data.sessions)
      const firstId = res.data.sessions?.[0]?.id
      if (firstId) setSessionId((prev) => prev || firstId)
    } catch (e) {
      setError(e?.response?.data?.error || e.message)
    }
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const onSubmit = async (e) => {
    e.preventDefault()
    setStatus('')
    setError('')

    try {
      await api.post('/attendance/manual', { sessionId, studentCollegeId: studentId })
      setStatus('Marked present.')
      setStudentId('')
    } catch (e2) {
      setError(e2?.response?.data?.error || e2.message)
    }
  }

  return (
    <div className="sm-page">
      <div>
        <div className="sm-page-title">Manual Attendance</div>
        <div className="sm-page-subtitle">Enter student ID and mark present.</div>
      </div>

      <form onSubmit={onSubmit} className="sm-card sm-card-body space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Active session</label>
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="mt-1 sm-select"
              required
            >
              {activeSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subject_code} — {s.id}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadSessions}
              className="mt-2 sm-btn-outline px-3 py-1.5"
            >
              Refresh sessions
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Student ID</label>
            <input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="mt-1 sm-input"
              placeholder="22CS0123"
              required
            />
          </div>
        </div>

        {status ? <div className="text-sm text-green-700">{status}</div> : null}
        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <button className="sm-btn-primary">
          Mark present
        </button>
      </form>
    </div>
  )
}
