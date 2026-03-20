import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../providers/AuthProvider.jsx'

export function RequireAuth() {
  const { loading, user } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-sm text-slate-600">Loading…</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

export function RequireRole({ role, children }) {
  const { loading, role: currentRole, getDefaultPath } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-sm text-slate-600">Loading…</div>
      </div>
    )
  }

  if (!currentRole) {
    return <Navigate to="/login" replace />
  }

  if (currentRole !== role) {
    return <Navigate to={getDefaultPath(currentRole)} replace />
  }

  return children
}
