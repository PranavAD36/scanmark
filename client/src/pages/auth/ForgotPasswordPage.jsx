import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { api } from '../../lib/api.js'

export function ForgotPasswordPage() {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSent(false)
    const trimmed = input.trim()
    if (!trimmed) {
      setError('Please enter your registered email address.')
      return
    }

    // Resolve college/faculty ID to email, or use email directly
    let email = trimmed
    if (!trimmed.includes('@')) {
      try {
        const res = await api.post('/auth/resolve-login', { collegeId: trimmed })
        email = res.data.email
      } catch (resolveErr) {
        // Show a privacy-safe message for all resolve failures
        setSent(true)
        return
      }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }

    setSending(true)
    try {
      /*
       * Supabase Auth: resetPasswordForEmail sends a magic link to the user.
       * The redirectTo must point to the app's /reset-password route where
       * the recovery session token (in the URL hash) will be consumed.
       *
       * Branded email setup (configure in Supabase Dashboard):
       *   1. Go to Project Settings > Auth > SMTP Settings
       *   2. Enable "Custom SMTP"
       *   3. Set sender name to "ScanMark" and sender email to your domain
       *   4. Configure SMTP host, port, username, password
       *   5. Go to Auth > Email Templates > Reset Password
       *   6. Customise the HTML template with ScanMark branding/logo
       *   7. The {{ .ConfirmationURL }} variable inserts the reset link
       */
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo: `${window.location.origin}/reset-password` },
      )
      if (resetError) throw resetError

      // Always show the same message to prevent email enumeration
      setSent(true)
    } catch (err) {
      const msg = err?.message || ''
      if (msg.toLowerCase().includes('rate limit')) {
        setError('Too many requests. Please wait a moment and try again.')
      } else {
        // Privacy-safe: don't reveal whether the email exists
        setSent(true)
      }
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
        <div className="text-2xl font-semibold text-slate-900">
          <span className="text-blue-700">Scan</span>Mark
        </div>
        <div className="mt-1 text-sm text-slate-600">
          Enter your College ID or registered email to receive a password reset link.
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              College ID or Email
            </label>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="mt-1 sm-input"
              placeholder="e.g. 22CS0123 or you@example.com"
              autoComplete="email"
              required
            />
          </div>

          {sent ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              If this email is registered, a reset link has been sent. Please check your inbox and spam folder.
            </div>
          ) : null}
          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <button
            type="submit"
            disabled={sending}
            className="w-full sm-btn-primary"
          >
            {sending ? 'Sending…' : 'Send reset link'}
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
