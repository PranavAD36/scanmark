import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { api } from '../../lib/api.js'

export function StudentScanQRPage() {
  const [elementId, setElementId] = useState('qr-reader')
  const qrRef = useRef(null)

  const [scanning, setScanning] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setElementId(`qr-reader-${Math.random().toString(36).slice(2)}`)
    return () => {
      if (qrRef.current) {
        qrRef.current.stop().catch(() => {})
        qrRef.current.clear().catch(() => {})
      }
    }
  }, [])

  const startScan = async () => {
    setError('')
    setStatus('')

    if (scanning) return

    try {
      const qr = new Html5Qrcode(elementId)
      qrRef.current = qr
      setScanning(true)

      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          try {
            setStatus('QR detected. Submitting…')
            await qr.stop()
            setScanning(false)

            const parsed = JSON.parse(decodedText)
            const sessionId = parsed.sessionId
            const subjectId = parsed.subjectId

            if (!sessionId || !subjectId) {
              throw new Error('Invalid QR payload')
            }

            const res = await api.post('/attendance/scan', { sessionId, subjectId })
            setStatus(`Attendance marked: ${res.data.status}`)
          } catch (e) {
            setError(e?.response?.data?.error || e.message)
          }
        },
        () => {},
      )
    } catch (e) {
      setScanning(false)
      setError(e?.message || 'Could not start camera')
    }
  }

  return (
    <div className="sm-page">
      <div>
        <div className="sm-page-title">Scan QR</div>
        <div className="sm-page-subtitle">Tap scan, point camera at the session QR.</div>
      </div>

      <div className="sm-card sm-card-body space-y-3">
        <button
          onClick={startScan}
          className="w-full sm:w-auto sm-btn-primary"
        >
          Scan QR
        </button>

        {status ? <div className="text-sm text-green-700">{status}</div> : null}
        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <div className="mt-2">
          <div id={elementId} className="w-full max-w-md mx-auto" />
        </div>

        <div className="text-xs text-slate-500">
          Works best on a real device with camera permissions.
        </div>
      </div>
    </div>
  )
}
