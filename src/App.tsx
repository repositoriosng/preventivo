import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth, useAuthInit } from '@/hooks/useAuth'

// Páginas
import LoginPage        from '@/pages/auth/LoginPage'
import DashboardPage    from '@/pages/operador/DashboardPage'
import ChecklistPage    from '@/pages/operador/ChecklistPage'
import AnomaliaPage     from '@/pages/operador/AnomaliaPage'
import SupervisorPage   from '@/pages/supervisor/SupervisorPage'

// Componentes
import ToastContainer   from '@/components/ui/ToastContainer'
import Spinner          from '@/components/ui/Spinner'

// ============================================================
//  Guards
// ============================================================

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { usuario, loading } = useAuth()
  if (loading) return <Spinner fullScreen />
  if (!usuario) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireSupervisor({ children }: { children: React.ReactNode }) {
  const { usuario, loading, esSupervisor } = useAuth()
  if (loading) return <Spinner fullScreen />
  if (!usuario) return <Navigate to="/login" replace />
  if (!esSupervisor) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { usuario, loading, esSupervisor } = useAuth()
  if (loading) return <Spinner fullScreen />
  if (!usuario) return <>{children}</>
  return <Navigate to={esSupervisor ? '/supervisor' : '/dashboard'} replace />
}

// ============================================================
//  App
// ============================================================

export default function App() {
  useAuthInit()

  return (
    <>
      <Routes>
        {/* Público */}
        <Route
          path="/login"
          element={
            <RedirectIfAuthed>
              <LoginPage />
            </RedirectIfAuthed>
          }
        />

        {/* Operador */}
        <Route path="/dashboard" element={
          <RequireAuth><DashboardPage /></RequireAuth>
        } />
        <Route path="/checklist/:maquinaId" element={
          <RequireAuth><ChecklistPage /></RequireAuth>
        } />
        <Route path="/anomalias" element={
          <RequireAuth><AnomaliaPage /></RequireAuth>
        } />

        {/* Supervisor */}
        <Route path="/supervisor" element={
          <RequireSupervisor><SupervisorPage /></RequireSupervisor>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      {/* Toasts globales */}
      <ToastContainer />
    </>
  )
}
