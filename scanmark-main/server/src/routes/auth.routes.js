const express = require('express')
const { z } = require('zod')
const { getSupabaseAdmin } = require('../lib/supabase')
const { getSupabasePublic } = require('../lib/supabase')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

function isDev() {
  return (process.env.NODE_ENV || 'development') !== 'production'
}

function debugAuth() {
  return isDev() && String(process.env.DEBUG_AUTH || '') === '1'
}

function isDbNotInitializedError(err) {
  const message = (err && err.message) || ''
  return message.includes("Could not find the table 'public.users'")
}

async function findAuthUserByLoginId(admin, loginId) {
  const needle = (loginId || '').toLowerCase()
  for (let page = 1; page <= 10; page += 1) {
    // listUsers is only available with service role key
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(error.message)
    const users = data?.users || []
    const match = users.find((u) => {
      const email = (u.email || '').toLowerCase()
      const metaLoginId = (u.user_metadata && u.user_metadata.loginId)
        ? String(u.user_metadata.loginId).toLowerCase()
        : ''
      return email === needle || metaLoginId === needle
    })
    if (match) return match
    if (users.length < 1000) return null
  }
  return null
}

router.post('/resolve-login', async (req, res, next) => {
  try {
    const body = z
      .object({
        collegeId: z.string().min(1),
      })
      .parse(req.body)

    const admin = getSupabaseAdmin()

    const { data, error } = await admin
      .from('users')
      .select('email')
      .or(`college_id.eq.${body.collegeId},faculty_id.eq.${body.collegeId},email.eq.${body.collegeId}`)
      .maybeSingle()

    if (error) {
      if (isDbNotInitializedError(error)) {
        // Fallback: resolve via Supabase Auth metadata (useful before schema.sql is applied)
        const user = await findAuthUserByLoginId(admin, body.collegeId)
        if (!user?.email) return res.status(404).json({ error: 'User not found' })
        return res.json({ email: user.email })
      }
      return res.status(500).json({ error: error.message })
    }
    if (!data?.email) return res.status(404).json({ error: 'User not found' })

    return res.json({ email: data.email })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request' })
    }
    return next(err)
  }
})

// Login using College ID / Faculty ID (or Email) + password.
// Returns tokens so the client can set the Supabase session.
router.post('/login', async (req, res, next) => {
  try {
    const body = z
      .object({
        loginId: z.string().min(1),
        password: z.string().min(1),
      })
      .parse(req.body)

    const startedAt = Date.now()
    if (debugAuth()) {
      // eslint-disable-next-line no-console
      console.log('[auth/login] start', { loginId: body.loginId })
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        error: 'Server misconfiguration: missing Supabase env vars',
        code: 'SERVER_MISCONFIG',
      })
    }

    const admin = getSupabaseAdmin()

    let email = null
    let role = null
    let usedFallback = false

    const { data: row, error: lookupError } = await admin
      .from('users')
      .select('email, role')
      .or(`college_id.eq.${body.loginId},faculty_id.eq.${body.loginId},email.eq.${body.loginId}`)
      .maybeSingle()

    if (debugAuth()) {
      // eslint-disable-next-line no-console
      console.log('[auth/login] users lookup done', {
        loginId: body.loginId,
        ok: !lookupError,
        usedDb: !lookupError,
      })
    }

    if (lookupError) {
      if (isDbNotInitializedError(lookupError)) {
        usedFallback = true
        if (debugAuth()) {
          // eslint-disable-next-line no-console
          console.log('[auth/login] db not initialized, falling back to auth metadata', { loginId: body.loginId })
        }
        const user = await findAuthUserByLoginId(admin, body.loginId)
        if (!user?.email) {
          if (isDev()) {
            // eslint-disable-next-line no-console
            console.warn('[auth/login] user not found (fallback)', { loginId: body.loginId })
          }
          return res.status(404).json({ error: 'User not found' })
        }
        email = user.email
        role = user.user_metadata?.role || null
      } else {
        if (isDev()) {
          // eslint-disable-next-line no-console
          console.warn('[auth/login] lookup failed', { loginId: body.loginId, error: lookupError.message })
        }
        return res.status(500).json({ error: lookupError.message })
      }
    } else {
      if (!row?.email) {
        if (isDev()) {
          // eslint-disable-next-line no-console
          console.warn('[auth/login] user not found', { loginId: body.loginId })
        }
        return res.status(404).json({ error: 'User not found' })
      }
      email = row.email
      role = row.role
    }

    if (!email) {
      // Should not happen, but keep responses deterministic
      return res.status(503).json({
        error: 'Login dependency unavailable',
        code: usedFallback ? 'AUTH_LOOKUP_FAILED' : 'PROFILE_LOOKUP_FAILED',
      })
    }

    const supabase = getSupabasePublic()
    if (debugAuth()) {
      // eslint-disable-next-line no-console
      console.log('[auth/login] attempting signInWithPassword', { loginId: body.loginId, email, usedFallback })
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: body.password,
    })

    if (error || !data?.session) {
      if (isDev()) {
        // eslint-disable-next-line no-console
        console.warn('[auth/login] invalid credentials', { loginId: body.loginId, email, usedFallback })
      }
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    if (debugAuth()) {
      // eslint-disable-next-line no-console
      console.log('[auth/login] success', { loginId: body.loginId, role, ms: Date.now() - startedAt })
    }

    return res.status(200).json({
      ok: true,
      role,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        token_type: data.session.token_type,
      },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request' })
    }
    return next(err)
  }
})

router.get('/me', requireAuth, async (req, res) => {
  res.json({
    id: req.profile.id,
    role: req.profile.role,
    name: req.profile.name,
    email: req.profile.email,
    collegeId: req.profile.college_id,
    facultyId: req.profile.faculty_id,
    authUserId: req.profile.auth_user_id,
  })
})

module.exports = router
