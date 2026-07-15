import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-4">
      <div className="sm-card p-6 w-full max-w-md shadow-sm">
        <div className="text-xl font-semibold text-slate-900">Page not found</div>
        <div className="mt-1 text-sm text-slate-600">
          The page you’re looking for doesn’t exist.
        </div>
        <div className="mt-4">
          <Link
            to="/login"
            className="sm-btn-primary"
          >
            Go to login
          </Link>
        </div>
      </div>
    </div>
  )
}
