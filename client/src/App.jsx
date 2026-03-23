import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './providers/AuthProvider.jsx'
import { RequireAuth, RequireRole } from './components/RequireAuth.jsx'
import { DashboardLayout } from './layouts/DashboardLayout.jsx'

import { LoginPage } from './pages/auth/LoginPage.jsx'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage.jsx'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage.jsx'
import { NotFoundPage } from './pages/misc/NotFoundPage.jsx'

import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.jsx'
import { AdminStudentsPage } from './pages/admin/AdminStudentsPage.jsx'
import { AdminFacultyPage } from './pages/admin/AdminFacultyPage.jsx'
import { AdminSubjectsPage } from './pages/admin/AdminSubjectsPage.jsx'
import { AdminUsersPage } from './pages/admin/AdminUsersPage.jsx'

import { FacultyDashboardPage } from './pages/faculty/FacultyDashboardPage.jsx'
import { FacultyQRSessionPage } from './pages/faculty/FacultyQRSessionPage.jsx'
import { FacultySessionResultsPage } from './pages/faculty/FacultySessionResultsPage.jsx'
import { FacultyManualAttendancePage } from './pages/faculty/FacultyManualAttendancePage.jsx'

import { StudentDashboardPage } from './pages/student/StudentDashboardPage.jsx'
import { StudentScanQRPage } from './pages/student/StudentScanQRPage.jsx'
import { StudentAttendanceRecordsPage } from './pages/student/StudentAttendanceRecordsPage.jsx'
import { StudentTimetablePage } from './pages/student/StudentTimetablePage.jsx'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route element={<RequireAuth />}>
            <Route
              path="/admin"
              element={
                <RequireRole role="admin">
                  <DashboardLayout />
                </RequireRole>
              }
            >
              <Route index element={<AdminDashboardPage />} />
              <Route path="students" element={<AdminStudentsPage />} />
              <Route path="faculty" element={<AdminFacultyPage />} />
              <Route path="subjects" element={<AdminSubjectsPage />} />
              <Route path="users" element={<AdminUsersPage />} />
            </Route>

            <Route
              path="/faculty"
              element={
                <RequireRole role="faculty">
                  <DashboardLayout />
                </RequireRole>
              }
            >
              <Route index element={<FacultyDashboardPage />} />
              <Route path="qr-session" element={<FacultyQRSessionPage />} />
              <Route path="session-results" element={<FacultySessionResultsPage />} />
              <Route path="manual-attendance" element={<FacultyManualAttendancePage />} />
            </Route>

            <Route
              path="/student"
              element={
                <RequireRole role="student">
                  <DashboardLayout />
                </RequireRole>
              }
            >
              <Route index element={<StudentDashboardPage />} />
              <Route path="scan" element={<StudentScanQRPage />} />
              <Route path="records" element={<StudentAttendanceRecordsPage />} />
              <Route path="timetable" element={<StudentTimetablePage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
