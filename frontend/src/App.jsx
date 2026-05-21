import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Projects from './pages/Projects'
import GlobalUsers from './pages/GlobalUsers'
import { ProtectedRoute } from './core/auth/ProtectedRoute'
import { DashboardLayout } from './app/layouts/DashboardLayout'
import { TodaySubmissionsView } from './modules/poleSurvey/components/TodaySubmissionsView'
import { ToastContainer } from './shared/components/ToastContainer'

function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes under DashboardLayout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/today-submissions" element={<TodaySubmissionsView />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/global-users" element={<GlobalUsers />} />
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
