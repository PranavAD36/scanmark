import axios from 'axios'

let authToken = null

export function setApiAuthToken(nextToken) {
  authToken = nextToken || null
}

function normalizeApiBaseUrl(input) {
  if (!input) return 'http://localhost:4000/api'
  const trimmed = String(input).replace(/\/+$/, '')
  if (trimmed.endsWith('/api')) return trimmed
  return `${trimmed}/api`
}

export const api = axios.create({
  baseURL: normalizeApiBaseUrl(import.meta.env.VITE_API_URL),
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${authToken}`
  }
  return config
})

export function isEmailLike(value) {
  return typeof value === 'string' && value.includes('@')
}

export async function resolveLoginEmail(collegeIdOrEmail) {
  if (isEmailLike(collegeIdOrEmail)) return collegeIdOrEmail

  const response = await api.post('/auth/resolve-login', {
    collegeId: collegeIdOrEmail,
  })

  return response.data.email
}
