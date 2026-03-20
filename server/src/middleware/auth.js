const { getSupabasePublic, getSupabaseAdmin } = require('../lib/supabase')

function isDbNotInitializedError(err) {
  const message = (err && err.message) || ''
  return message.includes("Could not find the table 'public.users'")
}

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null

    if (!token) return res.status(401).json({ error: 'Missing bearer token' })

    const supabase = getSupabasePublic()
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    req.auth = {
      user: data.user,
      token,
    }

    // Load app profile from database
    const admin = getSupabaseAdmin()
    const { data: profile, error: profileError } = await admin
      .from('users')
      .select('id, auth_user_id, role, name, email, college_id, faculty_id')
      .eq('auth_user_id', data.user.id)
      .maybeSingle()

    if (profileError) {
      if (isDbNotInitializedError(profileError)) {
        // Fallback for initial setup: use Auth metadata so login flow can complete.
        const role = data.user.user_metadata?.role || null
        if (!role) {
          return res.status(403).json({
            error: 'No ScanMark role found for this account (contact admin).',
          })
        }

        req.profile = {
          id: null,
          auth_user_id: data.user.id,
          role,
          name: data.user.user_metadata?.name || data.user.email,
          email: data.user.email,
          college_id: data.user.user_metadata?.collegeId || null,
          faculty_id: data.user.user_metadata?.facultyId || null,
        }

        return next()
      }

      return res.status(500).json({ error: profileError.message })
    }

    if (!profile) {
      return res.status(403).json({
        error: 'No ScanMark profile found for this account (contact admin).',
      })
    }

    req.profile = profile

    return next()
  } catch (err) {
    return next(err)
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.profile?.role) return res.status(401).json({ error: 'Unauthorized' })
    if (req.profile.role !== role) return res.status(403).json({ error: 'Forbidden' })
    return next()
  }
}

module.exports = { requireAuth, requireRole }
