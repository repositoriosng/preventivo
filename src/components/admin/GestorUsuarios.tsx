import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTodosLosUsuarios, actualizarUsuarioAdmin, crearUsuarioAdmin, eliminarUsuario, resetearPasswordAdmin } from '@/api/usuarios'
import type { CrearUsuarioDTO } from '@/api/usuarios'
import { useUIStore } from '@/store'
import type { Usuario } from '@/types'

export default function GestorUsuarios() {
  const qc = useQueryClient()
  const addToast = useUIStore(s => s.addToast)
  const [selected, setSelected] = useState<Usuario | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState<Usuario | null>(null)
  const [selectedForReset, setSelectedForReset] = useState<Usuario | null>(null)

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ['usuarios', 'admin'],
    queryFn: getTodosLosUsuarios,
  })

  const actualizar = useMutation({
    mutationFn: ({ id, nombre, rol, activo }: { id: string; nombre: string; rol: string; activo: boolean }) =>
      actualizarUsuarioAdmin(id, { nombre, rol: rol as Usuario['rol'], activo }),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Usuario actualizado correctamente' })
      qc.invalidateQueries({ queryKey: ['usuarios', 'admin'] })
      setSelected(null)
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Error al actualizar usuario'
      addToast({ type: 'error', message: msg })
    },
  })

  const crear = useMutation({
    mutationFn: (dto: CrearUsuarioDTO) => crearUsuarioAdmin(dto),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Usuario creado exitosamente' })
      qc.invalidateQueries({ queryKey: ['usuarios', 'admin'] })
      setIsCreating(false)
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Error al crear usuario'
      addToast({ type: 'error', message: msg })
    },
  })

  const eliminar = useMutation({
    mutationFn: (userId: string) => eliminarUsuario(userId),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Usuario eliminado' })
      qc.invalidateQueries({ queryKey: ['usuarios', 'admin'] })
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Error al eliminar usuario'
      addToast({ type: 'error', message: msg })
    },
  })

  const resetear = useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string, newPassword: string }) => resetearPasswordAdmin(userId, newPassword),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Contraseña restablecida exitosamente' })
      setSelectedForReset(null)
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Error al restablecer contraseña'
      addToast({ type: 'error', message: msg })
    },
  })

  function handleEliminar(u: Usuario) {
    setConfirmarEliminar(u)
  }

  return (
    <div style={s.container}>
      <div style={s.headerRow}>
        <div>
          <h2 style={s.title}>Gestión de Usuarios</h2>
          <p style={s.subtitle}>Administra los roles y el acceso de todos los usuarios registrados.</p>
        </div>
        <button style={s.btnNuevo} onClick={() => setIsCreating(true)}>+ Nuevo Usuario</button>
      </div>

      {isLoading ? (
        <p style={{ color: '#8AADA6', textAlign: 'center', marginTop: 20 }}>Cargando usuarios…</p>
      ) : (
        <div style={s.grid}>
          {usuarios?.map(u => (
            <div key={u.id} style={s.card}>
              <div style={s.cardTop}>
                <div>
                  <div style={s.name}>{u.nombre || 'Sin nombre'}</div>
                  <div style={s.email}>{u.email}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ ...s.badge, ...(u.rol === 'admin' ? s.badgeAdmin : u.rol === 'supervisor' ? s.badgeSup : s.badgeOp) }}>
                    {u.rol.toUpperCase()}
                  </div>
                  <div style={{ ...s.status, color: u.activo ? '#1D9E75' : '#E24B4A' }}>
                    {u.activo ? '● Activo' : '○ Inactivo'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={s.btnEditar} onClick={() => setSelected(u)} title="Editar Usuario">
                  Editar
                </button>
                <button
                  style={s.btnIcon}
                  onClick={() => setSelectedForReset(u)}
                  title="Restablecer Contraseña"
                >
                  🔑
                </button>
                <button
                  style={s.btnEliminar}
                  onClick={() => handleEliminar(u)}
                  disabled={eliminar.isPending}
                  title="Eliminar Usuario"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <ModalEditarUsuario
          usuario={selected}
          onClose={() => setSelected(null)}
          onGuardar={(nombre, rol, activo) => actualizar.mutate({ id: selected.id, nombre, rol, activo })}
          isPending={actualizar.isPending}
        />
      )}

      {isCreating && (
        <ModalCrearUsuario
          onClose={() => setIsCreating(false)}
          onGuardar={(dto) => crear.mutate(dto)}
          isPending={crear.isPending}
        />
      )}

      {confirmarEliminar && (
        <ModalConfirmar
          usuario={confirmarEliminar}
          isPending={eliminar.isPending}
          onCancelar={() => setConfirmarEliminar(null)}
          onConfirmar={() => {
            eliminar.mutate(confirmarEliminar.id)
            setConfirmarEliminar(null)
          }}
        />
      )}

      {selectedForReset && (
        <ModalResetPassword
          usuario={selectedForReset}
          onClose={() => setSelectedForReset(null)}
          onGuardar={(newPassword) => resetear.mutate({ userId: selectedForReset.id, newPassword })}
          isPending={resetear.isPending}
        />
      )}
    </div>
  )
}

function ModalEditarUsuario({
  usuario, onClose, onGuardar, isPending
}: {
  usuario: Usuario
  onClose: () => void
  onGuardar: (nombre: string, rol: string, activo: boolean) => void
  isPending: boolean
}) {
  const [nombre, setNombre] = useState(usuario.nombre || '')
  const [rol, setRol] = useState(usuario.rol)
  const [activo, setActivo] = useState(usuario.activo)

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div style={s.modalTitle}>Editar Usuario</div>
          <button style={s.modalClose} onClick={onClose}>✕</button>
        </div>

        <div style={s.modalBody}>
          <div style={s.infoBox}>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Cuenta</div>
            <div>{usuario.email}</div>
          </div>

          <label style={s.label}>Nombre completo</label>
          <input 
            style={s.input} 
            value={nombre} 
            onChange={e => setNombre(e.target.value)} 
            placeholder="Ej: Juan Pérez"
          />

          <label style={s.label}>Rol en el sistema</label>
          <select style={s.select} value={rol} onChange={e => setRol(e.target.value as any)}>
            <option value="operador">Operador (Dashboard, Checklists)</option>
            <option value="supervisor">Supervisor (Ver Anomalías, Máquinas)</option>
            <option value="admin">Administrador (Gestión Total)</option>
          </select>

          <label style={s.label}>Estado del acceso</label>
          <div style={s.radioGroup}>
            <label style={s.radioLabel}>
              <input type="radio" name="activo" checked={activo} onChange={() => setActivo(true)} />
              Activo (Permitir acceso)
            </label>
            <label style={s.radioLabel}>
              <input type="radio" name="activo" checked={!activo} onChange={() => setActivo(false)} />
              Inactivo (Bloquear acceso)
            </label>
          </div>

          <button
            style={{ ...s.btnGuardar, opacity: (isPending || !nombre.trim()) ? 0.7 : 1 }}
            disabled={isPending || !nombre.trim()}
            onClick={() => onGuardar(nombre.trim(), rol, activo)}
          >
            {isPending ? 'Guardando…' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalCrearUsuario({
  onClose, onGuardar, isPending
}: {
  onClose: () => void
  onGuardar: (dto: CrearUsuarioDTO) => void
  isPending: boolean
}) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState<CrearUsuarioDTO['rol']>('operador')

  const isValido = nombre && email && password.length >= 6

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div style={s.modalTitle}>Nuevo Usuario</div>
          <button style={s.modalClose} onClick={onClose}>✕</button>
        </div>

        <div style={s.modalBody}>
          <label style={s.label}>Nombre completo</label>
          <input 
            style={s.input} 
            value={nombre} 
            onChange={e => setNombre(e.target.value)} 
            placeholder="Ej: Juan Pérez"
          />

          <label style={s.label}>Correo electrónico</label>
          <input 
            type="email"
            style={s.input} 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            placeholder="ejemplo@maple.com"
          />

          <label style={s.label}>Contraseña temporal (mínimo 6 caracteres)</label>
          <input 
            type="text"
            style={s.input} 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            placeholder="maple2024"
          />

          <label style={s.label}>Rol en el sistema</label>
          <select style={s.select} value={rol} onChange={e => setRol(e.target.value as any)}>
            <option value="operador">Operador (Dashboard, Checklists)</option>
            <option value="supervisor">Supervisor (Ver Anomalías, Máquinas)</option>
            <option value="admin">Administrador (Gestión Total)</option>
          </select>

          <button
            style={{ ...s.btnGuardar, opacity: (isPending || !isValido) ? 0.7 : 1 }}
            disabled={isPending || !isValido}
            onClick={() => onGuardar({ nombre, email, password, rol })}
          >
            {isPending ? 'Creando…' : 'Crear Usuario'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal de confirmación de eliminación ────────────────────────
function ModalConfirmar({
  usuario, isPending, onCancelar, onConfirmar
}: {
  usuario: Usuario
  isPending: boolean
  onCancelar: () => void
  onConfirmar: () => void
}) {
  return (
    <div style={s.overlay} onClick={onCancelar}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.confirmHeader}>
          <div style={s.confirmIcon}>🗑️</div>
          <div style={s.confirmTitle}>Eliminar usuario</div>
          <div style={s.confirmSub}>Esta acción no se puede deshacer.</div>
        </div>

        <div style={s.confirmBody}>
          <div style={s.confirmInfo}>
            <div style={s.confirmNombre}>{usuario.nombre || 'Sin nombre'}</div>
            <div style={s.confirmEmail}>{usuario.email}</div>
          </div>

          <p style={s.confirmWarning}>
            ⚠️ Se eliminará permanentemente el acceso de este usuario al sistema.
          </p>

          <div style={s.confirmBtns}>
            <button style={s.btnCancelar} onClick={onCancelar} disabled={isPending}>
              Cancelar
            </button>
            <button
              style={{ ...s.btnDanger, opacity: isPending ? 0.7 : 1 }}
              onClick={onConfirmar}
              disabled={isPending}
            >
              {isPending ? 'Eliminando…' : 'Sí, eliminar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal de restablecer contraseña ─────────────────────────────
function ModalResetPassword({
  usuario, onClose, onGuardar, isPending
}: {
  usuario: Usuario
  onClose: () => void
  onGuardar: (newPassword: string) => void
  isPending: boolean
}) {
  const [password, setPassword] = useState('')
  const isValido = password.length >= 6

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div style={s.modalTitle}>Restablecer Contraseña</div>
          <button style={s.modalClose} onClick={onClose}>✕</button>
        </div>

        <div style={s.modalBody}>
          <div style={s.infoBox}>
            <strong>{usuario.nombre}</strong>
            <div>{usuario.email}</div>
          </div>

          <label style={s.label}>Nueva contraseña temporal (mínimo 6 caracteres)</label>
          <input 
            type="text"
            style={s.input} 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            placeholder="maple2024"
          />

          <button
            style={{ ...s.btnGuardar, opacity: (isPending || !isValido) ? 0.7 : 1 }}
            disabled={isPending || !isValido}
            onClick={() => onGuardar(password)}
          >
            {isPending ? 'Restableciendo…' : 'Restablecer Contraseña'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Estilos ────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  container: { background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #E2EFEB' },
  title:     { margin: '0 0 4px 0', fontSize: 18, color: '#0F2621' },
  subtitle:  { margin: '0 0 20px 0', fontSize: 13, color: '#5A7A72' },
  grid:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 },
  card:      { border: '1px solid #C8DED9', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 },
  cardTop:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  name:      { fontSize: 15, fontWeight: 700, color: '#0F2621' },
  email:     { fontSize: 12, color: '#5A7A72', marginTop: 2 },
  badge:     { fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 6, display: 'inline-block' },
  badgeAdmin:{ background: '#FCE7F3', color: '#BE185D' },
  badgeSup:  { background: '#FEF3C7', color: '#B45309' },
  badgeOp:   { background: '#E0F2FE', color: '#0369A1' },
  status:    { fontSize: 11, fontWeight: 600, marginTop: 6 },
  btnEditar:  { flex: 1, background: '#F0FAF6', border: '1px solid #C8DED9', color: '#1D9E75', borderRadius: 6, padding: '8px', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'center' },
  btnIcon:    { background: '#F8FAFC', border: '1px solid #CBD5E1', color: '#475569', borderRadius: 6, padding: '8px 10px', fontSize: 14, cursor: 'pointer' },
  btnEliminar:{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', borderRadius: 6, padding: '8px 10px', fontSize: 14, cursor: 'pointer' },
  
  // Modal
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal:       { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400 },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid #E2EFEB' },
  modalTitle:  { fontSize: 16, fontWeight: 700, color: '#0F2621' },
  modalClose:  { background: 'transparent', border: 'none', fontSize: 18, color: '#5A7A72', cursor: 'pointer' },
  modalBody:   { padding: 16, display: 'flex', flexDirection: 'column', gap: 12 },
  infoBox:     { background: '#F8FAFC', padding: 12, borderRadius: 8, fontSize: 13, color: '#475569', border: '1px solid #E2E8F0' },
  label:       { fontSize: 12, fontWeight: 600, color: '#2D4A42', marginTop: 4 },
  select:      { border: '1px solid #C8DED9', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#0F2621', background: '#fff', width: '100%' },
  input:       { border: '1px solid #C8DED9', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#0F2621', background: '#fff', width: '100%', boxSizing: 'border-box' },
  radioGroup:  { display: 'flex', flexDirection: 'column', gap: 8 },
  radioLabel:  { fontSize: 13, color: '#0F2621', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' },
  btnGuardar:  { background: '#1D9E75', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', transition: 'opacity 0.15s', marginTop: 12 },

  // Confirm modal
  confirmHeader: { background: '#FEF2F2', padding: '24px 20px 16px', borderRadius: '16px 16px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, borderBottom: '1px solid #FECACA' },
  confirmIcon:   { fontSize: 32, lineHeight: 1 },
  confirmTitle:  { fontSize: 17, fontWeight: 700, color: '#7F1D1D' },
  confirmSub:    { fontSize: 12, color: '#B91C1C' },
  confirmBody:   { padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: 14 },
  confirmInfo:   { background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 14px' },
  confirmNombre: { fontSize: 14, fontWeight: 700, color: '#0F2621' },
  confirmEmail:  { fontSize: 12, color: '#5A7A72', marginTop: 2 },
  confirmWarning:{ fontSize: 12, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 12px', margin: 0 },
  confirmBtns:   { display: 'flex', gap: 10 },
  btnCancelar:   { flex: 1, background: '#F8FAFC', border: '1px solid #C8DED9', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 600, color: '#5A7A72', cursor: 'pointer' },
  btnDanger:     { flex: 1, background: '#B91C1C', border: 'none', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', transition: 'opacity 0.15s' },
}
