import { useCallback, useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { api } from '../../lib/api.js'

function StudentList({ title, students, color }) {
  if (!students?.length) return null
  return (
    <div>
      <div className={`text-xs font-semibold mb-1 ${color}`}>
        {title} ({students.length})
      </div>
      <div className="flex flex-wrap gap-1">
        {students.map((s, i) => (
          <span
            key={i}
            className="text-xs bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5"
          >
            {s.college_id || s.name || '—'}
          </span>
        ))}
      </div>
    </div>
  )
}

export function FacultyQRSessionPage() {
  const SUBJECT_STORAGE_KEY = 'scanmark.faculty.selectedSubjectId'

  const [subjects, setSubjects] = useState([])
  const [subjectId, setSubjectId] = useState(() => {
    try {
      return localStorage.getItem(SUBJECT_STORAGE_KEY) || ''
    } catch {
      return ''
    }
  })
  const [activeSession, setActiveSession] = useState(null)
  const [qrUrl, setQrUrl] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [sessionResult, setSessionResult] = useState(null)

  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === subjectId) || null,
    [subjects, subjectId],
  )

  const generateQr = useCallback(async ({ sessionId, subjectId: subjId }) => {
    const payload = JSON.stringify({ sessionId, subjectId: subjId })
    const url = await QRCode.toDataURL(payload, { margin: 1, width: 300 })
    setQrUrl(url)
  }, [])

  const loadSubjects = useCallback(async () => {
    setError('')
    try {
      const res = await api.get('/subjects')
      setSubjects(res.data.subjects)

      const ids = (res.data.subjects || []).map((s) => s.id)
      const firstId = ids[0] || ''
      setSubjectId((prev) => {
        if (prev && ids.includes(prev)) return prev
        return firstId
      })
    } catch (e) {
      setError(e?.response?.data?.error || e.message)
    }
  }, [])

  const loadActiveSession = useCallback(async () => {
    setError('')
    try {
      const res = await api.get('/sessions/active')
      const s = res.data.sessions?.[0] || null
      if (!s) return

      setActiveSession(s)
      setSubjectId(s.subject_id)
      await generateQr({ sessionId: s.id, subjectId: s.subject_id })
      setStatus('Resumed active session.')
    } catch (e) {
      setError(e?.response?.data?.error || e.message)
    }
  }, [generateQr])

  useEffect(() => {
    loadSubjects()
    loadActiveSession()
  }, [loadSubjects, loadActiveSession])

  useEffect(() => {
    if (!subjectId) return
    try {
      localStorage.setItem(SUBJECT_STORAGE_KEY, subjectId)
    } catch {
      // ignore
    }
  }, [subjectId])

  const startSession = async () => {
    setError('')
    setStatus('')
    setQrUrl('')
    setBusy(true)

    try {
      const res = await api.post('/sessions/start', { subjectId })
      setActiveSession(res.data.session)

      // In case backend returned an existing active session
      setSubjectId(res.data.session.subject_id)

      await generateQr({
        sessionId: res.data.session.id,
        subjectId: res.data.session.subject_id,
      })
      setStatus('Session active for 15 minutes.')
    } catch (e) {
      setError(e?.response?.data?.error || e.message)
    } finally {
      setBusy(false)
    }
  }

  const endSession = async () => {
    if (!activeSession) return
    setError('')
    setStatus('')
    setSessionResult(null)
    setBusy(true)

    try {
      const res = await api.post(`/sessions/${activeSession.id}/end`)
      const d = res.data
      setSessionResult(d)
      setStatus(
        `Session ended. Present: ${d.present}/${d.totalStudents}, Absent: ${d.absent}, Attendance: ${d.attendancePercent}%`,
      )
      setActiveSession(null)
      setQrUrl('')
    } catch (e) {
      setError(e?.response?.data?.error || e.message)
    } finally {
      setBusy(false)
    }
  }

  const refreshAll = async () => {
    await loadSubjects()
    await loadActiveSession()
  }

  return (
    <div className="sm-page">
      <div>
        <div className="sm-page-title">QR Session</div>
        <div className="sm-page-subtitle">Select subject, generate QR, and end session.</div>
      </div>

      <div className="sm-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="w-full md:max-w-md">
            <label className="block text-sm font-medium text-gray-700">Subject</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="mt-1 sm-select"
              disabled={!!activeSession || busy}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-auto">
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={startSession}
                disabled={!subjectId || !!activeSession || busy}
                className="w-full sm:w-auto sm-btn-primary"
              >
                Generate QR
              </button>
              <button
                onClick={endSession}
                disabled={!activeSession || busy}
                className="w-full sm:w-auto sm-btn-outline"
              >
                End session
              </button>
              <button
                onClick={refreshAll}
                disabled={busy}
                className="w-full sm:w-auto sm-btn-outline"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {selectedSubject ? (
            <div className="text-sm text-slate-600">
              Selected: <span className="font-medium">{selectedSubject.code}</span>
            </div>
          ) : null}

          {status ? <div className="text-sm text-green-700">{status}</div> : null}
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
        </div>

        {activeSession ? (
          <div className="mt-5 pt-5 border-t">
            <div className="text-sm text-slate-700">
              <span className="font-medium">Session ID:</span> {activeSession.id}
            </div>
            <div className="text-sm text-slate-700">
              <span className="font-medium">Duration:</span> 15 min
            </div>

            {qrUrl ? (
              <div className="mt-4">
                <img
                  src={qrUrl}
                  alt="Session QR"
                  className="border border-slate-200 rounded-xl w-full max-w-[300px] aspect-square shadow-sm"
                />
                <div className="mt-2 text-xs text-gray-500">
                  QR contains sessionId + subjectId.
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {sessionResult ? (
        <div className="sm-card sm-card-body space-y-4">
          <div className="text-base font-semibold text-slate-900">Session Result</div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="text-xs text-slate-500">Total</div>
              <div className="text-xl font-semibold">{sessionResult.totalStudents}</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xs text-green-600">Present</div>
              <div className="text-xl font-semibold text-green-700">{sessionResult.present}</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-xs text-red-600">Absent</div>
              <div className="text-xl font-semibold text-red-700">{sessionResult.absent}</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xs text-blue-600">Attendance</div>
              <div className="text-xl font-semibold text-blue-700">{sessionResult.attendancePercent}%</div>
            </div>
          </div>

          <StudentList
            title="Present Students"
            students={sessionResult.presentStudents}
            color="text-green-700"
          />
          <StudentList
            title="Absent Students"
            students={sessionResult.absentStudents}
            color="text-red-700"
          />
        </div>
      ) : null}
    </div>
  )
}
