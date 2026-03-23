import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar.jsx'
import { Topbar } from '../components/Topbar.jsx'
import { MobileNav } from '../components/MobileNav.jsx'

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 min-w-0">
          <Topbar />
          <main className="p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
            <div className="max-w-7xl mx-auto">
            <Outlet />
            </div>
          </main>
        </div>
      </div>
      <MobileNav />
    </div>
  )
}
