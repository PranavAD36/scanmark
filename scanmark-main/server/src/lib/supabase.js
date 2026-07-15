const { createClient } = require('@supabase/supabase-js')

let _publicClient = null
let _adminClient = null

function getSupabasePublic() {
  if (!_publicClient) {
    const url = process.env.SUPABASE_URL
    const anonKey = process.env.SUPABASE_ANON_KEY
    _publicClient = createClient(url, anonKey, {
      auth: { persistSession: false },
    })
  }
  return _publicClient
}

function getSupabaseAdmin() {
  if (!_adminClient) {
    const url = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    _adminClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    })
  }
  return _adminClient
}

module.exports = { getSupabasePublic, getSupabaseAdmin }
