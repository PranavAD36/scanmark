import { useAuth } from '../providers/AuthProvider.jsx'

export function Topbar() {
  const { profile, signOut } = useAuth()

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="font-semibold text-slate-900">
          <span className="text-blue-700">Scan</span>Mark
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-600 hidden sm:block">
            {profile?.name || profile?.collegeId || profile?.email || ''}
          </div>
          <button
            onClick={signOut}
            className="px-3 py-1.5 rounded-md border border-slate-300 text-sm text-slate-800 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
