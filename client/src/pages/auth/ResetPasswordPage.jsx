import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    // Supabase client auto-detects session from URL for recovery links.
    supabase.auth.getSession().catch(() => {})
  }, [])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setStatus('')
    setSaving(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })
      if (updateError) throw updateError

      setStatus('Password updated. You can now log in.')
      setTimeout(() => navigate('/login', { replace: true }), 800)
    } catch (err) {
      setError(err?.message || 'Could not update password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md sm-card p-6 shadow-sm"
      >
        <div className="text-xl font-semibold text-slate-900">Set new password</div>
        <div className="mt-1 text-sm text-slate-600">
          Use the link from your email to set a new password.
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              New password
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 sm-input"
              type="password"
              minLength={8}
              required
            />
            <div className="mt-1 text-xs text-slate-500">
              Minimum 8 characters.
            </div>
          </div>

          {status ? <div className="text-sm text-green-700">{status}</div> : null}
          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <button
            type="submit"
            disabled={saving}
            className="w-full sm-btn-primary"
          >
            {saving ? 'Saving…' : 'Update password'}
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
