import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getInventarioResumen, login, type InventarioResumen } from '@/api/graphql'
import { ProductosPage } from '@/pages/admin/ProductosPage'
import { AlmacenesPage } from '@/pages/admin/AlmacenesPage'
import { MovimientosPage } from '@/pages/admin/MovimientosPage'
import { TercerosPage } from '@/pages/admin/TercerosPage'
import { ComprasPage } from '@/pages/admin/ComprasPage'
import { VentasPage } from '@/pages/admin/VentasPage'
import { DashboardPage } from '@/pages/admin/DashboardPage'
import { UsuariosPage } from '@/pages/admin/UsuariosPage'
import { LayoutDashboard, Package, LogOut, Warehouse, ArrowRightLeft, Users, ShoppingCart, Store, Shield } from 'lucide-react'

export default function App() {
  const [sesion, setSesion] = useState(() => localStorage.getItem('inventario_token') !== null)
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('inventario_user')
    return saved ? JSON.parse(saved) : null
  })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [iniciandoSesion, setIniciandoSesion] = useState(false)
  
  // Basic routing state
  const [currentRoute, setCurrentRoute] = useState<'dashboard' | 'productos' | 'almacenes' | 'movimientos' | 'terceros' | 'compras' | 'ventas' | 'usuarios'>('dashboard')

  async function iniciarSesion(event: FormEvent) {
    event.preventDefault()
    setIniciandoSesion(true)
    setLoginError(null)
    try {
      const result = await login(email, password)
      localStorage.setItem('inventario_token', result.login.token)
      localStorage.setItem('inventario_user', JSON.stringify(result.login.usuario))
      setCurrentUser(result.login.usuario)
      setSesion(true)
      setPassword('')
    } catch (reason: any) {
      setLoginError(reason.message || 'No se pudo iniciar sesion.')
    } finally { setIniciandoSesion(false) }
  }

  const handleLogout = () => {
    localStorage.removeItem('inventario_token')
    localStorage.removeItem('inventario_user')
    setCurrentUser(null)
    setSesion(false)
    setCurrentRoute('dashboard')
  }

  if (!sesion) return (
    <main className="login-shell">
      <section className="login-panel">
        <p className="eyebrow">CONTROL OPERATIVO</p>
        <h1>Inventario</h1>
        <p className="login-copy">Accede para consultar y administrar el inventario.</p>
        <form onSubmit={iniciarSesion} className="login-form">
          <label>Correo<input type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" /></label>
          <label>Contraseña<input type="password" value={password} onChange={event => setPassword(event.target.value)} required autoComplete="current-password" /></label>
          {loginError && <div className="notice error">{loginError}</div>}
          <button className="primary-button" disabled={iniciandoSesion}>{iniciandoSesion ? 'Validando...' : 'Ingresar'}</button>
        </form>
      </section>
    </main>
  )

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div style={{ padding: '12px 16px', marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, color: '#147b68' }}>Ferretería<br/>Inventario</h2>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          <button 
            className={`sidebar-link ${currentRoute === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentRoute('dashboard')}
          >
            <LayoutDashboard size={20} /> Dashboard
          </button>
          
          {(currentUser?.is_staff || currentUser?.roles?.some((r: any) => ['Admin', 'Almacenero', 'Vendedor', 'Comprador'].includes(r.name))) && (
            <button 
              className={`sidebar-link ${currentRoute === 'productos' ? 'active' : ''}`}
              onClick={() => setCurrentRoute('productos')}
            >
              <Package size={20} /> Productos
            </button>
          )}
          
          {(currentUser?.is_staff || currentUser?.roles?.some((r: any) => ['Admin', 'Almacenero'].includes(r.name))) && (
            <>
              <button 
                className={`sidebar-link ${currentRoute === 'almacenes' ? 'active' : ''}`}
                onClick={() => setCurrentRoute('almacenes')}
              >
                <Warehouse size={20} /> Almacenes
              </button>
              <button 
                className={`sidebar-link ${currentRoute === 'movimientos' ? 'active' : ''}`}
                onClick={() => setCurrentRoute('movimientos')}
              >
                <ArrowRightLeft size={20} /> Movimientos
              </button>
            </>
          )}

          {(currentUser?.is_staff || currentUser?.roles?.some((r: any) => ['Admin', 'Vendedor', 'Comprador'].includes(r.name))) && (
            <button 
              className={`sidebar-link ${currentRoute === 'terceros' ? 'active' : ''}`}
              onClick={() => setCurrentRoute('terceros')}
            >
              <Users size={20} /> Terceros
            </button>
          )}

          {(currentUser?.is_staff || currentUser?.roles?.some((r: any) => ['Admin', 'Comprador'].includes(r.name))) && (
            <button 
              className={`sidebar-link ${currentRoute === 'compras' ? 'active' : ''}`}
              onClick={() => setCurrentRoute('compras')}
            >
              <ShoppingCart size={20} /> Compras
            </button>
          )}

          {(currentUser?.is_staff || currentUser?.roles?.some((r: any) => ['Admin', 'Vendedor'].includes(r.name))) && (
            <button 
              className={`sidebar-link ${currentRoute === 'ventas' ? 'active' : ''}`}
              onClick={() => setCurrentRoute('ventas')}
            >
              <Store size={20} /> Ventas
            </button>
          )}

          {currentUser?.is_staff && (
            <button 
              className={`sidebar-link ${currentRoute === 'usuarios' ? 'active' : ''}`}
              onClick={() => setCurrentRoute('usuarios')}
            >
              <Shield size={20} /> Usuarios
            </button>
          )}
        </nav>
        
        <div style={{ marginTop: 'auto', paddingTop: 24, borderTop: '1px solid #d8e4e0' }}>
          <button className="sidebar-link" onClick={handleLogout} style={{ color: '#d9534f' }}>
            <LogOut size={20} /> Cerrar Sesión
          </button>
        </div>
      </aside>
      
      <main className="main-content">
        {currentRoute === 'productos' && <ProductosPage />}
        {currentRoute === 'almacenes' && <AlmacenesPage />}
        {currentRoute === 'movimientos' && <MovimientosPage />}
        {currentRoute === 'terceros' && <TercerosPage />}
        {currentRoute === 'compras' && <ComprasPage />}
        {currentRoute === 'ventas' && <VentasPage />}
        {currentRoute === 'usuarios' && <UsuariosPage />}
        {currentRoute === 'dashboard' && <DashboardPage />}
      </main>
    </div>
  )
}
