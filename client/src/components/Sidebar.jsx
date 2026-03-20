import { NavLink } from 'react-router-dom'
import { useAuth } from '../providers/AuthProvider.jsx'

function Item({ to, label }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        [
          'block px-3 py-2 rounded-md text-sm font-medium transition-colors',
          isActive
            ? 'bg-blue-50 text-blue-700'
            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900',
        ].join(' ')
      }
    >
      {label}
    </NavLink>
  )
}

export function Sidebar() {
  const { role } = useAuth()

  const links =
    role === 'admin'
      ? [
          { to: '/admin', label: 'Dashboard' },
          { to: '/admin/students', label: 'Add Student' },
          { to: '/admin/faculty', label: 'Add Faculty' },
          { to: '/admin/subjects', label: 'Manage Subjects' },
          { to: '/admin/users', label: 'Manage Users' },
        ]
      : role === 'faculty'
        ? [
            { to: '/faculty', label: 'Dashboard' },
            { to: '/faculty/qr-session', label: 'QR Session' },
            { to: '/faculty/session-results', label: 'Session Results' },
            { to: '/faculty/manual-attendance', label: 'Manual Attendance' },
          ]
        : [
            { to: '/student', label: 'Dashboard' },
            { to: '/student/scan', label: 'Scan QR' },
            { to: '/student/records', label: 'Attendance Records' },
            { to: '/student/summary', label: 'Attendance Summary' },
            { to: '/student/timetable', label: 'Timetable' },
          ]

  return (
    <aside className="w-64 hidden md:block bg-white border-r border-slate-200 min-h-screen">
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">ScanMark</div>
            <div className="mt-0.5 text-xs text-slate-500">Attendance Dashboard</div>
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-700 bg-blue-50 border border-blue-100 rounded-md px-2 py-1">
            {role ? role : '—'}
          </div>
        </div>

        <nav className="mt-6 space-y-1">
          {links.map((l) => (
            <Item key={l.to} to={l.to} label={l.label} />
          ))}
        </nav>
      </div>
    </aside>
  )
}
