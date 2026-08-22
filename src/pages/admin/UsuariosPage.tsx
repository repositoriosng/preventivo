import { useEffect, useState, FormEvent } from 'react'
import { Plus, Edit2, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Badge } from '@/components/ui/Badge'
import { 
  getUsuarios, crearUsuario, actualizarUsuario, desactivarUsuario, getRoles, 
  UsuarioResumen, RolResumen, getInventarioResumen, InventarioResumen
} from '@/api/graphql'

export function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioResumen[]>([])
  const [roles, setRoles] = useState<RolResumen[]>([])
  const [almacenes, setAlmacenes] = useState<InventarioResumen['almacenes']>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<number[]>([])

  const cargarDatos = async () => {
    setCargando(true)
    try {
      const [resUsuarios, resRoles, resInv] = await Promise.all([
        getUsuarios(),
        getRoles(),
        getInventarioResumen()
      ])
      setUsuarios(resUsuarios.usuarios)
      setRoles(resRoles.roles)
      setAlmacenes(resInv.almacenes)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const handleOpenModal = (usuario?: UsuarioResumen) => {
    if (usuario) {
      setEditingId(usuario.id)
      setSelectedRoles(usuario.roles.map(r => r.id))
    } else {
      setEditingId(null)
      setSelectedRoles([])
    }
    setIsModalOpen(true)
  }

  const toggleRole = (rolId: number) => {
    setSelectedRoles(prev => 
      prev.includes(rolId) ? prev.filter(id => id !== rolId) : [...prev, rolId]
    )
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (selectedRoles.length === 0) {
      alert("Debes seleccionar al menos un rol para el usuario.")
      return
    }

    const form = new FormData(e.currentTarget)
    const email = form.get('email') as string
    const nombre = form.get('nombre') as string
    const password = form.get('password') as string
    const telefono = form.get('telefono') as string
    const cargo = form.get('cargo') as string
    const almacen_id = form.get('almacen_id') ? Number(form.get('almacen_id')) : undefined

    try {
      if (editingId) {
        await actualizarUsuario(editingId, email, nombre, selectedRoles, telefono, cargo, almacen_id, password)
      } else {
        if (!password) {
          alert("La contraseña es obligatoria para nuevos usuarios.")
          return
        }
        await crearUsuario(email, password, nombre, selectedRoles, telefono, cargo, almacen_id)
      }
      setIsModalOpen(false)
      cargarDatos()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleToggleActivo = async (id: number) => {
    if (!confirm('¿Cambiar estado de este usuario? Si es el tuyo, podrías perder acceso.')) return
    try {
      await desactivarUsuario(id)
      cargarDatos()
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (cargando && !usuarios.length) return <div>Cargando...</div>
  if (error) return <div className="notice error">{error}</div>

  const editUser = editingId ? usuarios.find(u => u.id === editingId) : null

  return (
    <div className="content-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">ADMINISTRACIÓN</p>
          <h2>Gestión de Usuarios</h2>
        </div>
        <button className="primary-button" onClick={() => handleOpenModal()}>
          <Plus size={16} style={{display:'inline', verticalAlign:'text-top', marginRight:4}}/> 
          Nuevo Usuario
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo / Usuario</th>
              <th>Roles</th>
              <th>Cargo</th>
              <th>Bodega Asignada</th>
              <th>Estado</th>
              <th style={{textAlign:'right'}}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => {
              const activo = u.perfil ? u.perfil.activo : u.is_staff
              return (
                <tr key={u.id} style={{ opacity: activo ? 1 : 0.6 }}>
                  <td><strong>{u.first_name || 'Sin nombre'}</strong></td>
                  <td>{u.email}</td>
                  <td>
                    {u.is_staff ? (
                      <Badge variant="warning">SuperAdmin (Staff)</Badge>
                    ) : (
                      <div style={{display:'flex', gap:4, flexWrap:'wrap'}}>
                        {u.roles.map(r => <Badge key={r.id} variant="info">{r.name}</Badge>)}
                      </div>
                    )}
                  </td>
                  <td>{u.perfil?.cargo || '-'}</td>
                  <td>{u.perfil?.almacen_predeterminado?.nombre || '-'}</td>
                  <td>
                    {activo ? (
                      <Badge variant="success"><CheckCircle2 size={12}/> Activo</Badge>
                    ) : (
                      <Badge variant="error"><XCircle size={12}/> Inactivo</Badge>
                    )}
                  </td>
                  <td style={{textAlign:'right'}}>
                    <button className="icon-button" title="Editar" onClick={() => handleOpenModal(u)}>
                      <Edit2 size={18} />
                    </button>
                    {!u.is_staff && (
                      <button className="icon-button" title="Cambiar Estado" onClick={() => handleToggleActivo(u.id)}>
                        <ShieldAlert size={18} color={activo ? "#d9534f" : "#5cb85c"} />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Editar Usuario' : 'Nuevo Usuario'}>
        <form onSubmit={handleSubmit} style={{maxWidth: 500}}>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
            <FormField label="Nombre Completo">
              <input type="text" name="nombre" defaultValue={editUser?.first_name} required />
            </FormField>
            <FormField label="Correo (Usuario de login)">
              <input type="email" name="email" defaultValue={editUser?.email} required />
            </FormField>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
            <FormField label={editingId ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}>
              <input type="password" name="password" minLength={6} />
            </FormField>
            <FormField label="Teléfono">
              <input type="tel" name="telefono" defaultValue={editUser?.perfil?.telefono} />
            </FormField>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
            <FormField label="Cargo / Puesto">
              <input type="text" name="cargo" defaultValue={editUser?.perfil?.cargo} />
            </FormField>
            <FormField label="Bodega Predeterminada">
              <select name="almacen_id" defaultValue={editUser?.perfil?.almacen_predeterminado?.id || ''}>
                <option value="">Ninguna</option>
                {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </FormField>
          </div>

          <div style={{marginTop: 16, marginBottom: 24}}>
            <label style={{display:'block', fontWeight:600, marginBottom:8, color:'#374151'}}>Roles y Permisos del Sistema</label>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, background:'#f9fafb', padding:16, borderRadius:8, border:'1px solid #e5e7eb'}}>
              {roles.map(rol => (
                <label key={rol.id} style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:14, color:'#4b5563'}}>
                  <input 
                    type="checkbox" 
                    checked={selectedRoles.includes(rol.id)}
                    onChange={() => toggleRole(rol.id)}
                    style={{width:16, height:16, accentColor:'#147b68'}}
                  />
                  {rol.name}
                </label>
              ))}
            </div>
            {selectedRoles.length === 0 && <p style={{color:'#ef4444', fontSize:12, marginTop:4}}>Selecciona al menos un rol.</p>}
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="primary-button">Guardar Usuario</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
