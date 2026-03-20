import { useCallback, useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { api } from '../../lib/api.js'

export function FacultyQRSessionPage() {
  const [subjects, setSubjects] = useState([])
  const [subjectId, setSubjectId] = useState('')
  const [activeSession, setActiveSession] = useState(null)
  const [qrUrl, setQrUrl] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === subjectId) || null,
    [subjects, subjectId],
  )

  const loadSubjects = useCallback(async () => {
    setError('')
    try {
      const res = await api.get('/subjects')
      setSubjects(res.data.subjects)
      const firstId = res.data.subjects?.[0]?.id
      if (firstId) setSubjectId((prev) => prev || firstId)
    } catch (e) {
      setError(e?.response?.data?.error || e.message)
    }
  }, [])

  useEffect(() => {
    loadSubjects()
  }, [loadSubjects])

  const startSession = async () => {
    setError('')
    setStatus('')
    setQrUrl('')

    try {
      const res = await api.post('/sessions/start', { subjectId })
      setActiveSession(res.data.session)

      const payload = JSON.stringify({
        sessionId: res.data.session.id,
        subjectId: res.data.session.subject_id,
      })

      const url = await QRCode.toDataURL(payload, { margin: 1, width: 300 })
      setQrUrl(url)
      setStatus('Session active for 15 minutes.')
    } catch (e) {
      setError(e?.response?.data?.error || e.message)
    }
  }

  const endSession = async () => {
    if (!activeSession) return
    setError('')
    setStatus('')

    try {
      const res = await api.post(`/sessions/${activeSession.id}/end`)
      setStatus(
        `Session ended. Present: ${res.data.present}, Absent: ${res.data.absent}, Attendance: ${res.data.attendancePercent}%`,
      )
      setActiveSession(null)
      setQrUrl('')
    } catch (e) {
      setError(e?.response?.data?.error || e.message)
    }
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
              disabled={!!activeSession}
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
                disabled={!subjectId || !!activeSession}
                className="w-full sm:w-auto sm-btn-primary"
              >
                Generate QR
              </button>
              <button
                onClick={endSession}
                disabled={!activeSession}
                className="w-full sm:w-auto sm-btn-outline"
              >
                End session
              </button>
              <button
                onClick={loadSubjects}
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
    </div>
  )
}
