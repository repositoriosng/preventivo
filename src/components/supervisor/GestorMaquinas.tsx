import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTodasLasMaquinas, crearMaquina, actualizarMaquina, eliminarMaquina } from '@/api/maquinas'
import type { CrearMaquinaDTO, ActualizarMaquinaDTO } from '@/types'
import { useUIStore } from '@/store'
import type { Maquina } from '@/types'
import { ESTADO_MAQUINA_COLOR, ESTADO_MAQUINA_LABEL } from '@/lib/constants'
import ModalPlantillaChecklist from './ModalPlantillaChecklist'
import { Pencil, ClipboardList, Trash2, MoreVertical, AlertTriangle } from 'lucide-react'

export default function GestorMaquinas() {
  const qc = useQueryClient()
  const addToast = useUIStore(s => s.addToast)
  const [selected, setSelected] = useState<Maquina | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [plantillaMaquina, setPlantillaMaquina] = useState<Maquina | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [filtroTexto, setFiltroTexto] = useState('')
  const [confirmarEliminar, setConfirmarEliminar] = useState<Maquina | null>(null)
  
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const { data: maquinas, isLoading } = useQuery({
    queryKey: ['maquinas', 'admin'],
    queryFn: getTodasLasMaquinas,
  })

  const actualizar = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ActualizarMaquinaDTO }) => actualizarMaquina(id, dto),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Máquina actualizada' })
      qc.invalidateQueries({ queryKey: ['maquinas'] })
      setSelected(null)
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Error al actualizar máquina'
      addToast({ type: 'error', message: msg })
    },
  })

  const eliminar = useMutation({
    mutationFn: (id: string) => eliminarMaquina(id),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Máquina eliminada' })
      qc.invalidateQueries({ queryKey: ['maquinas'] })
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Error al eliminar máquina'
      addToast({ type: 'error', message: msg })
    },
  })

  const crear = useMutation({
    mutationFn: (dto: CrearMaquinaDTO) => crearMaquina(dto),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Máquina creada exitosamente' })
      qc.invalidateQueries({ queryKey: ['maquinas'] })
      setIsCreating(false)
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Error al crear máquina'
      addToast({ type: 'error', message: msg })
    },
  })

  const maquinasFiltradas = maquinas?.filter(m => {
    if (!filtroTexto) return true
    const q = filtroTexto.toLowerCase()
    return m.nombre.toLowerCase().includes(q) ||
           m.codigo.toLowerCase().includes(q) ||
           m.area.toLowerCase().includes(q)
  })

  return (
    <div style={s.container}>
      <div style={s.headerRow}>
        <div>
          <h2 style={s.title}>Gestión de Máquinas</h2>
          <p style={s.subtitle}>Catálogo de equipos de la planta.</p>
        </div>
        <div style={s.headerActions}>
          <div style={s.searchContainer}>
            <span style={s.searchIcon}>🔍</span>
            <input 
              style={s.searchInput}
              placeholder="Buscar por código, nombre o área..."
              value={filtroTexto}
              onChange={e => setFiltroTexto(e.target.value)}
            />
          </div>
          <button style={s.btnNuevo} onClick={() => setIsCreating(true)}>+ Nueva Máquina</button>
        </div>
      </div>

      {isLoading ? (
        <p style={{ color: '#8AADA6', textAlign: 'center', marginTop: 20 }}>Cargando máquinas…</p>
      ) : maquinasFiltradas?.length === 0 ? (
        <p style={{ color: '#8AADA6', textAlign: 'center', marginTop: 20 }}>No se encontraron máquinas para esta búsqueda.</p>
      ) : (
        <div style={s.grid} ref={menuRef}>
          {maquinasFiltradas?.map(m => {
            const color = m.activa ? ESTADO_MAQUINA_COLOR[m.estado_actual] : '#94a3b8'
            const isMenuOpen = openMenuId === m.id
            
            return (
              <div key={m.id} style={{ ...s.card, opacity: m.activa ? 1 : 0.6 }}>
                <div style={{ ...s.cardBorder, background: color }} />
                <div style={s.cardBody}>
                  <div style={s.cardTop}>
                    <span style={s.name}>{m.nombre}</span>
                    <div style={s.topRight}>
                      <span style={{ ...s.badge, background: color + '22', color }}>
                        {m.activa ? ESTADO_MAQUINA_LABEL[m.estado_actual] : 'Inactiva'}
                      </span>
                      <div style={s.menuContainer}>
                        <button 
                          style={s.btnMenu} 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(isMenuOpen ? null : m.id)
                          }}
                        >
                          <MoreVertical size={18} />
                        </button>
                        {isMenuOpen && (
                          <div style={s.dropdown}>
                            <button style={s.dropdownItem} onClick={() => { setSelected(m); setOpenMenuId(null); }}>
                              <Pencil size={14} /> Editar detalles
                            </button>
                            <button style={s.dropdownItem} onClick={() => { setPlantillaMaquina(m); setOpenMenuId(null); }}>
                              <ClipboardList size={14} /> Editar checklist
                            </button>
                            <div style={s.dropdownDivider} />
                            <button style={{...s.dropdownItem, color: '#DC2626'}} onClick={() => {
                              setOpenMenuId(null);
                              setConfirmarEliminar(m)
                            }}>
                              <Trash2 size={14} /> Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={s.meta}>
                    Área: {m.area} · Código: {m.codigo}
                  </div>
                  {!m.activa && <div style={s.inactivaAviso}>Dado de baja</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selected && (
        <ModalMaquina
          maquina={selected}
          onClose={() => setSelected(null)}
          onGuardar={(dto) => actualizar.mutate({ id: selected.id, dto })}
          isPending={actualizar.isPending}
        />
      )}

      {isCreating && (
        <ModalMaquina
          onClose={() => setIsCreating(false)}
          onGuardar={(dto) => crear.mutate(dto as CrearMaquinaDTO)}
          isPending={crear.isPending}
        />
      )}

      {plantillaMaquina && (
        <ModalPlantillaChecklist
          maquina={plantillaMaquina}
          onClose={() => setPlantillaMaquina(null)}
        />
      )}

      {confirmarEliminar && (
        <ModalConfirmarEliminar
          maquina={confirmarEliminar}
          isPending={eliminar.isPending}
          onCancelar={() => setConfirmarEliminar(null)}
          onConfirmar={() => {
            eliminar.mutate(confirmarEliminar.id)
            setConfirmarEliminar(null)
          }}
        />
      )}
    </div>
  )
}

function ModalMaquina({
  maquina, onClose, onGuardar, isPending
}: {
  maquina?: Maquina
  onClose: () => void
  onGuardar: (dto: ActualizarMaquinaDTO | CrearMaquinaDTO) => void
  isPending: boolean
}) {
  const isEdit = !!maquina
  const [nombre, setNombre] = useState(maquina?.nombre ?? '')
  const [codigo, setCodigo] = useState(maquina?.codigo ?? '')
  const [area, setArea] = useState(maquina?.area ?? '')
  const [descripcion, setDescripcion] = useState(maquina?.descripcion ?? '')
  const [activa, setActiva] = useState(maquina?.activa ?? true)

  const isValido = nombre && codigo && area

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div style={s.modalTitle}>{isEdit ? 'Editar Máquina' : 'Nueva Máquina'}</div>
          <button style={s.modalClose} onClick={onClose}>✕</button>
        </div>

        <div style={s.modalBody}>
          <label style={s.label}>Nombre de la máquina</label>
          <input style={s.input} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Compresor Principal" />

          <label style={s.label}>Código identificador</label>
          <input style={s.input} value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Ej: COMP-01" />

          <label style={s.label}>Área / Ubicación</label>
          <input style={s.input} value={area} onChange={e => setArea(e.target.value)} placeholder="Ej: Planta Sur" />

          <label style={s.label}>Descripción (opcional)</label>
          <textarea style={s.textarea} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Detalles extra..." rows={3} />

          {isEdit && (
            <>
              <label style={s.label}>Estado en el sistema</label>
              <div style={s.radioGroup}>
                <label style={s.radioLabel}>
                  <input type="radio" checked={activa} onChange={() => setActiva(true)} />
                  Operativa (Visible)
                </label>
                <label style={s.radioLabel}>
                  <input type="radio" checked={!activa} onChange={() => setActiva(false)} />
                  Dar de baja (Oculta)
                </label>
              </div>
            </>
          )}

          <button
            style={{ ...s.btnGuardar, opacity: (isPending || !isValido) ? 0.7 : 1 }}
            disabled={isPending || !isValido}
            onClick={() => onGuardar(isEdit ? { nombre, codigo, area, descripcion, activa } : { nombre, codigo, area, descripcion })}
          >
            {isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal de confirmación de eliminación ─────────────────────────
function ModalConfirmarEliminar({
  maquina, isPending, onCancelar, onConfirmar
}: {
  maquina: Maquina
  isPending: boolean
  onCancelar: () => void
  onConfirmar: () => void
}) {
  return (
    <div style={s.overlay} onClick={onCancelar}>
      <div style={{ ...s.modal, maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div style={s.confirmHeader}>
          <div style={s.confirmIconWrap}>
            <AlertTriangle size={28} color="#B91C1C" strokeWidth={2} />
          </div>
          <div style={s.confirmTitle}>Eliminar máquina</div>
          <div style={s.confirmSub}>Esta acción es irreversible.</div>
        </div>
        <div style={s.confirmBody}>
          <div style={s.confirmInfo}>
            <div style={s.confirmNombre}>{maquina.nombre}</div>
            <div style={s.confirmMeta}>{maquina.area} · {maquina.codigo}</div>
          </div>
          <p style={s.confirmWarning}>
            Se eliminará permanentemente junto con su plantilla de checklist.
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

// ── Estilos ────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  container: { background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #E2EFEB' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  title:     { margin: '0 0 4px 0', fontSize: 18, color: '#0F2621' },
  subtitle:  { margin: 0, fontSize: 13, color: '#5A7A72' },
  headerActions: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  searchContainer: { position: 'relative', minWidth: 260 },
  searchIcon:  { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#8AADA6', pointerEvents: 'none' },
  searchInput: { width: '100%', padding: '8px 12px 8px 32px', border: '1px solid #C8DED9', borderRadius: 8, fontSize: 13, outline: 'none', color: '#0F2621', boxSizing: 'border-box' },
  btnNuevo:  { background: '#1D9E75', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' },
  
  grid:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 },
  card:      { background: '#fff', borderRadius: 12, display: 'flex', border: '1px solid #E2EFEB', overflow: 'visible', transition: 'transform 0.15s, box-shadow 0.15s' },
  cardBorder:  { width: 5, flexShrink: 0 },
  cardBody:    { flex: 1, padding: '12px 14px' },
  cardTop:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  topRight:    { display: 'flex', alignItems: 'center', gap: 8 },
  name:        { fontSize: 15, fontWeight: 700, color: '#0F2621' },
  meta:        { fontSize: 12, color: '#5A7A72' },
  badge:       { fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99 },
  inactivaAviso:{ fontSize: 11, color: '#E24B4A', fontWeight: 600, marginTop: 6 },
  
  // Menú contextual
  menuContainer: { position: 'relative' },
  btnMenu:     { background: 'transparent', border: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer', padding: '0 4px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  dropdown:    { position: 'absolute', top: 28, right: 0, background: '#fff', border: '1px solid #E2EFEB', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '4px 0', minWidth: 168, zIndex: 10 },
  dropdownItem:{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '8px 16px', fontSize: 13, color: '#0F2621', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 },
  dropdownDivider: { height: 1, background: '#E2EFEB', margin: '4px 0' },

  // Confirm modal
  confirmHeader: { background: '#FEF2F2', padding: '28px 20px 16px', borderRadius: '16px 16px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, borderBottom: '1px solid #FECACA' },
  confirmIconWrap: { width: 56, height: 56, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  confirmTitle:  { fontSize: 17, fontWeight: 700, color: '#7F1D1D' },
  confirmSub:    { fontSize: 12, color: '#B91C1C' },
  confirmBody:   { padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: 14 },
  confirmInfo:   { background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 14px' },
  confirmNombre: { fontSize: 14, fontWeight: 700, color: '#0F2621' },
  confirmMeta:   { fontSize: 12, color: '#5A7A72', marginTop: 2 },
  confirmWarning:{ fontSize: 12, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 12px', margin: 0 },
  confirmBtns:   { display: 'flex', gap: 10 },
  btnCancelar:   { flex: 1, background: '#F8FAFC', border: '1px solid #C8DED9', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 600, color: '#5A7A72', cursor: 'pointer' },
  btnDanger:     { flex: 1, background: '#B91C1C', border: 'none', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', transition: 'opacity 0.15s' },
  
  // Modal
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal:       { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 450, maxHeight: '90dvh', overflow: 'auto' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid #E2EFEB' },
  modalTitle:  { fontSize: 16, fontWeight: 700, color: '#0F2621' },
  modalClose:  { background: 'transparent', border: 'none', fontSize: 18, color: '#5A7A72', cursor: 'pointer' },
  modalBody:   { padding: 16, display: 'flex', flexDirection: 'column', gap: 12 },
  label:       { fontSize: 12, fontWeight: 600, color: '#2D4A42', marginTop: 4 },
  input:       { border: '1px solid #C8DED9', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#0F2621', background: '#fff', width: '100%', boxSizing: 'border-box' },
  textarea:    { border: '1px solid #C8DED9', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#0F2621', background: '#fff', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' },
  radioGroup:  { display: 'flex', flexDirection: 'column', gap: 8 },
  radioLabel:  { fontSize: 13, color: '#0F2621', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' },
  btnGuardar:  { background: '#1D9E75', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', transition: 'opacity 0.15s', marginTop: 12 },
}
