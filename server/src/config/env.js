const dotenv = require('dotenv')

function loadEnv() {
  dotenv.config()

  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']
  const missing = required.filter((k) => !process.env[k])
  if (missing.length) {
    // eslint-disable-next-line no-console
    console.warn(`Missing env vars: ${missing.join(', ')}`)
  }
}

module.exports = { loadEnv }
