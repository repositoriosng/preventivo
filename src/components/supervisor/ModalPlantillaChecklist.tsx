import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTodaPlantillaChecklist, crearItemPlantilla, actualizarItemPlantilla, eliminarItemPlantilla } from '@/api/maquinas'
import type { CrearItemPlantillaDTO, ActualizarItemPlantillaDTO } from '@/types'
import { useUIStore } from '@/store'
import type { Maquina, ChecklistPlantilla } from '@/types'

export default function ModalPlantillaChecklist({
  maquina, onClose
}: {
  maquina: Maquina
  onClose: () => void
}) {
  const qc = useQueryClient()
  const addToast = useUIStore(s => s.addToast)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editCat, setEditCat] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Fetch de ítems ──
  const { data: items, isLoading } = useQuery({
    queryKey: ['plantilla', maquina.id],
    queryFn: () => getTodaPlantillaChecklist(maquina.id),
  })

  // ── Agrupamiento por categoría ──
  const categorias = items?.reduce((acc, item) => {
    const cat = item.categoria || 'Sin categoría'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {} as Record<string, ChecklistPlantilla[]>)

  // ── Formulario nuevo ítem ──
  const [nuevaCat, setNuevaCat] = useState('')
  const [nuevoNombre, setNuevoNombre] = useState('')

  const crear = useMutation({
    mutationFn: (dto: CrearItemPlantillaDTO) => crearItemPlantilla(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plantilla', maquina.id] })
      setNuevoNombre('')
      setNuevaCat('')
      addToast({ type: 'success', message: 'Ítem agregado' })
    },
    onError: (err) => {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Error' })
    }
  })

  const actualizar = useMutation({
    mutationFn: ({ id, dto }: { id: string, dto: ActualizarItemPlantillaDTO }) => actualizarItemPlantilla(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plantilla', maquina.id] })
      setEditingId(null)
      addToast({ type: 'success', message: 'Ítem actualizado' })
    },
    onError: (err) => {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Error' })
    }
  })

  const eliminar = useMutation({
    mutationFn: (id: string) => eliminarItemPlantilla(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plantilla', maquina.id] })
      addToast({ type: 'success', message: 'Ítem eliminado' })
    },
    onError: (err) => {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Error' })
    }
  })

  const handleCrear = () => {
    if (!nuevoNombre || !nuevaCat) return
    const maxOrden = items?.reduce((max, i) => Math.max(max, i.orden), 0) ?? 0
    crear.mutate({
      maquina_id: maquina.id,
      nombre_item: nuevoNombre.trim(),
      categoria: nuevaCat.trim(),
      orden: maxOrden + 1
    })
  }

  const handleToggle = (item: ChecklistPlantilla) => {
    actualizar.mutate({ id: item.id, dto: { activo: !item.activo } })
  }

  const startEdit = (item: ChecklistPlantilla) => {
    setEditingId(item.id)
    setEditNombre(item.nombre_item)
    setEditCat(item.categoria || '')
    setOpenMenuId(null)
  }

  const confirmEdit = (item: ChecklistPlantilla) => {
    if (!editNombre.trim()) return
    actualizar.mutate({ id: item.id, dto: { nombre_item: editNombre.trim(), categoria: editCat.trim() || item.categoria } })
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div>
            <div style={s.modalTitle}>Checklist de Revisión</div>
            <div style={s.modalSub}>{maquina.nombre} ({maquina.codigo})</div>
          </div>
          <button style={s.modalClose} onClick={onClose}>✕</button>
        </div>

        <div style={s.modalBody}>
          
          <div style={s.sectionTitle}>Agregar nuevo ítem</div>
          <div style={s.formRow}>
            <input 
              style={{ ...s.input, flex: 1 }} 
              placeholder="Categoría (Ej: Mecánico)" 
              value={nuevaCat} 
              onChange={e => setNuevaCat(e.target.value)} 
              list="cats-existentes"
            />
            <datalist id="cats-existentes">
              {Object.keys(categorias ?? {}).map(c => <option key={c} value={c} />)}
            </datalist>

            <input 
              style={{ ...s.input, flex: 2 }} 
              placeholder="¿Qué se debe revisar?" 
              value={nuevoNombre} 
              onChange={e => setNuevoNombre(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleCrear()}
            />
            
            <button 
              style={{ ...s.btnGuardar, opacity: (!nuevoNombre || !nuevaCat || crear.isPending) ? 0.6 : 1 }} 
              disabled={!nuevoNombre || !nuevaCat || crear.isPending}
              onClick={handleCrear}
            >
              {crear.isPending ? '...' : '+ Agregar'}
            </button>
          </div>

          <div style={s.sectionTitle}>Ítems actuales</div>
          <div style={s.listContainer} ref={menuRef}>
            {isLoading && <div style={s.loading}>Cargando plantilla…</div>}
            
            {!isLoading && items?.length === 0 && (
              <div style={s.loading}>No hay ítems configurados para esta máquina.</div>
            )}

            {categorias && Object.entries(categorias).map(([catName, catItems]) => (
              <div key={catName} style={s.catGroup}>
                <div style={s.catHeader}>{catName.toUpperCase()}</div>
                {catItems.map(item => {
                  const isEditing = editingId === item.id
                  const isMenuOpen = openMenuId === item.id

                  return (
                    <div key={item.id} style={{ ...s.itemRow, opacity: item.activo ? 1 : 0.55 }}>
                      {isEditing ? (
                        // ── Modo edición inline ──
                        <div style={s.editRow}>
                          <input
                            style={{ ...s.input, flex: 1, fontSize: 12 }}
                            value={editCat}
                            onChange={e => setEditCat(e.target.value)}
                            placeholder="Categoría"
                          />
                          <input
                            style={{ ...s.input, flex: 2, fontSize: 12 }}
                            value={editNombre}
                            onChange={e => setEditNombre(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') confirmEdit(item); if (e.key === 'Escape') setEditingId(null) }}
                            autoFocus
                          />
                          <button style={s.btnSave} onClick={() => confirmEdit(item)} disabled={actualizar.isPending}>✓</button>
                          <button style={s.btnCancel} onClick={() => setEditingId(null)}>✕</button>
                        </div>
                      ) : (
                        // ── Vista normal ──
                        <>
                          <div style={s.itemInfo}>
                            <span style={s.itemOrden}>{item.orden}.</span>
                            <span style={{ textDecoration: item.activo ? 'none' : 'line-through' }}>
                              {item.nombre_item}
                            </span>
                          </div>
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <button
                              style={s.btnMenu}
                              onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : item.id) }}
                            >
                              ⋮
                            </button>
                            {isMenuOpen && (
                              <div style={s.dropdown}>
                                <button style={s.dropdownItem} onClick={() => startEdit(item)}>
                                  ✏️ Editar
                                </button>
                                <button style={s.dropdownItem} onClick={() => { setOpenMenuId(null); handleToggle(item) }}>
                                  {item.activo ? '🔕 Desactivar' : '✅ Activar'}
                                </button>
                                <div style={s.dropdownDivider} />
                                <button style={{ ...s.dropdownItem, color: '#DC2626' }} onClick={() => {
                                  setOpenMenuId(null)
                                  if (confirm(`¿Eliminar "${item.nombre_item}"?`)) eliminar.mutate(item.id)
                                }}>
                                  🗑️ Eliminar
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Estilos ────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal:       { background: '#F8FAFC', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '90dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  modalHeader: { background: '#fff', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: 20, borderBottom: '1px solid #E2E8F0' },
  modalTitle:  { fontSize: 18, fontWeight: 700, color: '#0F2621' },
  modalSub:    { fontSize: 13, color: '#5A7A72', marginTop: 2 },
  modalClose:  { background: 'transparent', border: 'none', fontSize: 20, color: '#5A7A72', cursor: 'pointer' },
  
  modalBody:   { padding: 20, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'auto' },
  sectionTitle:{ fontSize: 14, fontWeight: 600, color: '#2D4A42', marginBottom: -8 },
  
  formRow:     { display: 'flex', gap: 10, alignItems: 'center', background: '#fff', padding: 12, borderRadius: 12, border: '1px solid #E2E8F0' },
  input:       { border: '1px solid #C8DED9', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#0F2621', background: '#F8FAFC', outline: 'none' },
  btnGuardar:  { background: '#1D9E75', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'opacity 0.15s' },
  
  listContainer:{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 16, display: 'flex', flexDirection: 'column', gap: 20 },
  loading:      { fontSize: 13, color: '#64748B', textAlign: 'center', padding: 20 },
  
  catGroup:     { display: 'flex', flexDirection: 'column', gap: 6 },
  catHeader:    { fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: 0.5, borderBottom: '1px solid #E2E8F0', paddingBottom: 4, marginBottom: 2 },

  itemRow:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', transition: 'opacity 0.2s', gap: 8 },
  itemInfo:     { fontSize: 13, color: '#0F2621', fontWeight: 500, display: 'flex', gap: 10, alignItems: 'center', flex: 1, minWidth: 0 },
  itemOrden:    { color: '#94A3B8', fontWeight: 700, fontSize: 12, width: 20, flexShrink: 0 },

  // Inline edit
  editRow:      { display: 'flex', gap: 6, alignItems: 'center', flex: 1 },
  btnSave:      { background: '#1D9E75', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontWeight: 700 },
  btnCancel:    { background: '#E2E8F0', border: 'none', color: '#475569', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontWeight: 700 },

  // 3-dots menu
  btnMenu:       { background: 'transparent', border: 'none', fontSize: 18, color: '#94A3B8', cursor: 'pointer', padding: '2px 6px', lineHeight: 1 },
  dropdown:      { position: 'absolute', top: 26, right: 0, background: '#fff', border: '1px solid #E2EFEB', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '4px 0', minWidth: 150, zIndex: 20 },
  dropdownItem:  { width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '8px 14px', fontSize: 12, color: '#0F2621', cursor: 'pointer' },
  dropdownDivider: { height: 1, background: '#E2EFEB', margin: '4px 0' },
}
