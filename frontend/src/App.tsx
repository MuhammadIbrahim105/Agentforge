import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProjectPage from './pages/ProjectPage'
import AnalyticsPage from './pages/AnalyticsPage'

function App() {
  const token = useAuthStore((state) => state.token)

  return (
    <Routes>
      <Route path="/" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
      <Route path="/login" element={!token ? <LoginPage /> : <Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={token ? <DashboardPage /> : <Navigate to="/login" replace />} />
      <Route path="/project/:id" element={token ? <ProjectPage /> : <Navigate to="/login" replace />} />
      <Route path="/analytics" element={token ? <AnalyticsPage /> : <Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App