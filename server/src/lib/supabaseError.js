function isMissingTableError(err) {
  const message = (err && err.message) || ''
  return /Could not find the table 'public\.[^']+'/.test(message)
}

function respondSupabaseError(res, error, fallbackStatus = 500) {
  if (isMissingTableError(error)) {
    return res.status(503).json({
      error: 'Database not initialized. Run server/supabase/schema.sql in Supabase SQL Editor.',
      code: 'DB_NOT_INITIALIZED',
    })
  }

  const status = fallbackStatus || 500
  return res.status(status).json({ error: error?.message || 'Server error' })
}

module.exports = { isMissingTableError, respondSupabaseError }
