import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [sessionReady, setSessionReady] = useState(false)
  const [sessionError, setSessionError] = useState(false)
  const readyRef = useRef(false)

  useEffect(() => {
    // The recovery link from email contains tokens in the URL hash.
    // Supabase JS client detects them via detectSessionInUrl: true and fires
    // a PASSWORD_RECOVERY auth state change event.
    //
    // The AuthProvider is intentionally configured to skip PASSWORD_RECOVERY
    // events so that this page can handle the recovery session itself.

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        readyRef.current = true
        setSessionReady(true)
      }
    })

    // The hash tokens may have already been consumed before this listener
    // mounted (race with supabase client init). Check for an existing session.
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        readyRef.current = true
        setSessionReady(true)
      }
    })

    // Give Supabase enough time to process the URL hash tokens.
    // If no recovery session is established, show guidance.
    const timer = setTimeout(() => {
      if (!readyRef.current) {
        setSessionError(true)
      }
    }, 6000)

    return () => {
      clearTimeout(timer)
      subscription?.subscription?.unsubscribe?.()
    }
  }, [])

  const validate = () => {
    const errs = {}
    if (!password) {
      errs.password = 'Password is required.'
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters.'
    }
    if (!confirmPassword) {
      errs.confirmPassword = 'Please confirm your new password.'
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.'
    }
    return errs
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setStatus('')
    const errs = validate()
    setFieldErrors(errs)
    if (Object.keys(errs).length) return

    setSaving(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })
      if (updateError) {
        const msg = updateError.message || ''
        if (
          msg.toLowerCase().includes('same password') ||
          msg.toLowerCase().includes('should be different')
        ) {
          throw new Error('New password must be different from your current password.')
        }
        throw updateError
      }

      setStatus('Password updated successfully. You can now log in with your new password.')
      // Sign out so the user starts a clean login session
      await supabase.auth.signOut().catch(() => {})
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    } catch (err) {
      const msg = err?.message || ''
      if (
        msg.toLowerCase().includes('not authorized') ||
        msg.toLowerCase().includes('session') ||
        msg.toLowerCase().includes('auth')
      ) {
        setError('This reset link is invalid or has expired. Please request a new one.')
      } else {
        setError(msg || 'Could not update password. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  // Show expired / invalid link state
  if (sessionError && !sessionReady) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 p-4">
        <div className="w-full max-w-md sm-card p-6 shadow-sm space-y-4">
          <div className="text-2xl font-semibold text-slate-900">
            <span className="text-blue-700">Scan</span>Mark
          </div>
          <div className="text-sm text-red-600">
            This reset link is invalid or has expired.
          </div>
          <div className="text-sm text-slate-600">
            Please request a new password reset link.
          </div>
          <div className="flex gap-3">
            <Link to="/forgot-password" className="sm-btn-primary px-4 py-2 text-sm">
              Request new link
            </Link>
            <Link to="/login" className="sm-btn-outline px-4 py-2 text-sm">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    )
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
          Set a new password for your account.
        </div>

        {!sessionReady ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
            <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Verifying reset link…
          </div>
        ) : (
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
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
                required
              />
              {fieldErrors.password ? (
                <div className="text-xs text-red-600 mt-1">{fieldErrors.password}</div>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Confirm new password
              </label>
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 sm-input"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter your new password"
                required
              />
              {fieldErrors.confirmPassword ? (
                <div className="text-xs text-red-600 mt-1">{fieldErrors.confirmPassword}</div>
              ) : null}
            </div>

            {status ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                {status}
              </div>
            ) : null}
            {error ? <div className="text-sm text-red-600">{error}</div> : null}

            <button
              type="submit"
              disabled={saving}
              className="w-full sm-btn-primary"
            >
              {saving ? 'Updating…' : 'Update password'}
            </button>

            <div className="text-sm text-slate-600">
              <Link to="/login" className="text-blue-700 hover:text-blue-800">
                Back to login
              </Link>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
        )}
      </form>
    </div>
  )
}
