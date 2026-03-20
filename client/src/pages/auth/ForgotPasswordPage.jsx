import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { resolveLoginEmail } from '../../lib/api.js'

export function ForgotPasswordPage() {
  const [collegeId, setCollegeId] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setStatus('')
    setSending(true)

    try {
      const email = await resolveLoginEmail(collegeId.trim())
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        },
      )
      if (resetError) throw resetError
      setStatus('Password reset link sent (check your email).')
    } catch (err) {
      setError(err?.message || 'Could not send reset email')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md sm-card p-6 shadow-sm"
      >
        <div className="text-xl font-semibold text-slate-900">Reset password</div>
        <div className="mt-1 text-sm text-slate-600">
          Enter your College ID to receive a reset email.
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              College ID (or Email)
            </label>
            <input
              value={collegeId}
              onChange={(e) => setCollegeId(e.target.value)}
              className="mt-1 sm-input"
              required
            />
          </div>

          {status ? <div className="text-sm text-green-700">{status}</div> : null}
          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <button
            type="submit"
            disabled={sending}
            className="w-full sm-btn-primary"
          >
            {sending ? 'Sending…' : 'Send reset email'}
          </button>

          <div className="text-sm text-slate-600">
            <Link to="/login" className="text-blue-700 hover:text-blue-800">
              Back to login
            </Link>
          </div>
        </div>
      </form>
    </div>
  )
}
