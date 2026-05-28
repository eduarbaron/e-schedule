import { useState, useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import { LoginPage } from './pages/Login'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Docentes } from './pages/Docentes'
import { Sedes } from './pages/Sedes'
import { Celulas } from './pages/Celulas'
import { Materias } from './pages/Materias'
import { Asignaciones } from './pages/Asignaciones'
import { Mapa } from './pages/Mapa'
import { Programas } from './pages/Programas'
import { Periodos } from './pages/Periodos'
import { Facultades } from './pages/Facultades'
import { Clases } from './pages/Clases'
import { HorarioSede } from './pages/HorarioSede'
import { PlantillasClases } from './pages/PlantillasClases'
import { ProyeccionClases } from './pages/ProyeccionClases'
import { DocumentacionStandalone } from './pages/Documentacion'
import { Usuarios } from './pages/Usuarios'
import { PeriodoProvider } from './context/PeriodoContext'

type Page = 'dashboard' | 'docentes' | 'sedes' | 'celulas' | 'programas' | 'periodos' | 'facultades' | 'materias' | 'clases' | 'plantillas-clases' | 'proyeccion-clases' | 'horario-sede' | 'asignaciones' | 'mapa' | 'usuarios'

function App() {
  const { user, isLoading, isAdmin } = useAuth();
  const [page, setPage] = useState<Page>('dashboard')

  // Resetear a dashboard cada vez que cambia el usuario (login/logout/cambio de cuenta)
  // Esto evita que un usuario hereda la página activa de una sesión anterior
  useEffect(() => {
    setPage('dashboard')
  }, [user?.id])

  if (window.location.pathname === '/docs') {
    return <DocumentacionStandalone />
  }

  if (isLoading) return null;
  if (!user) return <LoginPage />;

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard />
      case 'docentes': return <Docentes />
      case 'sedes': return <Sedes />
      case 'celulas': return <Celulas />
      case 'programas': return <Programas />
      case 'periodos': return <Periodos />
      case 'facultades': return <Facultades />
      case 'materias': return <Materias />
      case 'clases': return <Clases />
      case 'plantillas-clases': return <PlantillasClases />
      case 'proyeccion-clases': return <ProyeccionClases />
      case 'horario-sede': return <HorarioSede />
      case 'asignaciones': return <Asignaciones />
      case 'mapa': return <Mapa />
      case 'usuarios': return isAdmin ? <Usuarios /> : <Dashboard />
      default: return <Dashboard />
    }
  }

  return (
    <PeriodoProvider>
      <Layout activePage={page} onNavigate={(p) => setPage(p as Page)}>
        {renderPage()}
      </Layout>
    </PeriodoProvider>
  )
}

export default App
