// import { useState } from 'react'
// import { Link, useLocation, useNavigate } from 'react-router-dom'
// import { supabase } from '../../lib/supabase.js'
// import { api } from '../../lib/api.js'
// import { useAuth } from '../../providers/AuthProvider.jsx'

// export function LoginPage() {
//   const navigate = useNavigate()
//   const location = useLocation()
//   const { refreshProfile, getDefaultPath } = useAuth()

//   const [collegeId, setCollegeId] = useState('')
//   const [password, setPassword] = useState('')
//   const [submitting, setSubmitting] = useState(false)
//   const [error, setError] = useState('')

//   const toUserMessage = (err) => {
//     const status = err?.response?.status
//     const apiError = err?.response?.data?.error
//     const message = err?.message || ''
//     const code = err?.code

//     if (status === 404) return 'No account found for that ID. Please contact admin.'
//     if (status === 401) return 'Invalid ID or password.'
//     if (status === 400) return apiError || 'Invalid request. Please try again.'
//     if (status === 500) return 'Server error. Please try again in a moment.'

//     if (code === 'ECONNABORTED') {
//       return 'Login request timed out. Please try again.'
//     }

//     if (message.toLowerCase().includes('invalid login credentials')) {
//       return 'Invalid ID or password.'
//     }
//     if (message.toLowerCase().includes('email not confirmed')) {
//       return 'Email not confirmed. Please use “Forgot password” or contact admin.'
//     }

//     return apiError || message || 'Login failed'
//   }

//   const onSubmit = async (e) => {
//     e.preventDefault()
//     setError('')
//     setSubmitting(true)

//     try {
//       const res = await api.post('/auth/login', {
//         loginId: collegeId.trim(),
//         password,
//       })

//       const session = res.data?.session
//       if (!session?.access_token || !session?.refresh_token) {
//         throw new Error('Login failed (missing session)')
//       }

//       const { error: setSessionError } = await supabase.auth.setSession({
//         access_token: session.access_token,
//         refresh_token: session.refresh_token,
//       })
//       if (setSessionError) throw setSessionError

//       // Use role from login response for instant navigation; refreshProfile
//       // runs in the background via onAuthStateChange.
//       const loginRole = res.data?.role
//       refreshProfile()

//       const from = location.state?.from
//       if (typeof from === 'string' && from.startsWith('/')) {
//         navigate(from, { replace: true })
//         return
//       }

//       navigate(getDefaultPath(loginRole), { replace: true })
//     } catch (err) {
//       setError(toUserMessage(err))
//     } finally {
//       setSubmitting(false)
//     }
//   }

//   return (
//     <div className="min-h-screen grid place-items-center bg-slate-50 p-4">
//       <form
//         onSubmit={onSubmit}
//         className="w-full max-w-md sm-card p-6 shadow-sm"
//       >
//         <div className="text-2xl font-semibold text-slate-900">
//           <span className="text-blue-700">Scan</span>Mark
//         </div>
//         <div className="mt-1 text-sm text-slate-600">
//           Sign in with College ID and password.
//         </div>

//         <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
//           <div className="font-semibold text-slate-900 mb-2">Sample credentials</div>
//           <div className="space-y-2">
//             <div>
//               <span className="font-medium">Admin:</span> admin@example.com / Password123
//             </div>
//             <div>
//               <span className="font-medium">Faculty:</span> faculty01@example.com / Password123
//             </div>
//             <div>
//               <span className="font-medium">Student:</span> student01@example.com / Password123
//             </div>
//           </div>
//         </div>

//         <div className="mt-6 space-y-4">
//           <div>
//             <label className="block text-sm font-medium text-gray-700">
//               College ID (or Email)
//             </label>
//             <input
//               value={collegeId}
//               onChange={(e) => setCollegeId(e.target.value)}
//               className="mt-1 sm-input"
//               placeholder="Enter ID"
//               autoComplete="username"
//               required
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700">
//               Password
//             </label>
//             <input
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               className="mt-1 sm-input"
//               type="password"
//               placeholder="Enter Password"
//               autoComplete="current-password"
//               required
//             />
//           </div>

//           {error ? (
//             <div className="text-sm text-red-600">{error}</div>
//           ) : null}

//           <button
//             type="submit"
//             disabled={submitting}
//             className="w-full sm-btn-primary"
//           >
//             {submitting ? 'Signing in…' : 'Sign in'}
//           </button>

//           <div className="text-sm text-slate-600 flex justify-between">
//             <span />
//             <Link to="/forgot-password" className="text-blue-700 hover:text-blue-800">
//               Forgot password?
//             </Link>
//           </div>
//         </div>
//       </form>
//     </div>
//   )
// }
