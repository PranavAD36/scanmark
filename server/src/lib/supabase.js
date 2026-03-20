const { createClient } = require('@supabase/supabase-js')

function getSupabasePublic() {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  return createClient(url, anonKey, {
    auth: { persistSession: false },
  })
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  })
}

module.exports = { getSupabasePublic, getSupabaseAdmin }
