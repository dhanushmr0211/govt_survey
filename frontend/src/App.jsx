import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Projects from './pages/Projects'
import Users from './pages/Users'
import { ProtectedRoute } from './core/auth/ProtectedRoute'
import { DashboardLayout } from './app/layouts/DashboardLayout'
import { TodaySubmissionsView } from './modules/poleSurvey/components/TodaySubmissionsView'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes under DashboardLayout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/today-submissions" element={<TodaySubmissionsView />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/users" element={<Users />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>
        
        {/* Fallback */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
