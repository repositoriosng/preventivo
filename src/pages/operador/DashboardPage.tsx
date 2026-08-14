import { useState } from 'react'
import { Sunrise, Sun, Moon, AlertTriangle, ClipboardList, ChevronRight, X, LogOut, Clock, CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth }      from '@/hooks/useAuth'
import { useTurno }     from '@/hooks/useTurno'
import { useMaquinas }  from '@/hooks/useMaquinas'
import { getAnomalias, actualizarAnomalia } from '@/api/anomalias'
import { getChecklistsTurno } from '@/api/checklist'
import { useUIStore }   from '@/store'
import { formatRelativo, iniciales, colorAvatar, formatFecha } from '@/lib/utils'
import { 
  TURNO_LABELS, ESTADO_MAQUINA_COLOR, ESTADO_MAQUINA_LABEL, 
  SEVERIDAD_COLOR, ESTADO_ANOM_LABEL, CATEGORIA_LABEL, CATEGORIA_COLOR, SEVERIDAD_LABEL
} from '@/lib/constants'
import type { Maquina, TipoTurno, Anomalia, ChecklistRegistro } from '@/types'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { usuario, logout }         = useAuth()
  const { turnoActivo, hayTurnoAbierto, abrir, cerrar } = useTurno()
  const { data: maquinas, isLoading } = useMaquinas()
  const [showCerrarTurno, setShowCerrarTurno] = useState(false)

  // Checklists del turno activo para mostrar cuáles ya fueron revisadas
  const { data: checklistsTurno } = useQuery({
    queryKey: ['checklists-turno', turnoActivo?.id],
    queryFn: () => getChecklistsTurno(turnoActivo!.id),
    enabled: !!turnoActivo?.id,
    refetchInterval: 60_000,
  })

  // Mapa maquinaId -> registro del checklist en este turno
  const checklistMap = new Map<string, ChecklistRegistro>()
  checklistsTurno?.forEach(c => checklistMap.set(c.maquina_id, c))

  async function handleAbrirTurno(tipo: TipoTurno) {
    await abrir(tipo)
  }

  async function handleCerrarTurno() {
    await cerrar()
    setShowCerrarTurno(false)
  }

  return (
    <div style={s.page}>
      {/* ── Topbar ── */}
      <div style={s.topbar}>
        <div style={s.topbarLeft}>
          <div
            style={{ ...s.avatar, background: colorAvatar(usuario?.nombre ?? 'U') }}
            aria-label={`Avatar de ${usuario?.nombre}`}
          >
            {iniciales(usuario?.nombre ?? 'U')}
          </div>
          <div>
            <div style={s.topbarName}>{usuario?.nombre}</div>
            <div style={s.topbarRole}>{usuario?.rol}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {hayTurnoAbierto && (
            <button style={s.btnCerrar} onClick={() => setShowCerrarTurno(true)}>
              Cerrar turno
            </button>
          )}
          <button style={s.btnCerrar} onClick={logout}>
            Salir
          </button>
        </div>
      </div>

      <div style={s.body}>
        {/* ── Estado del turno ── */}
        {!hayTurnoAbierto ? (
          <div style={s.card}>
            <h2 style={s.sectionTitle}>Iniciar turno</h2>
            <p style={{ fontSize: 13, color: '#5A7A72', marginBottom: 16 }}>
              Selecciona el turno que vas a cubrir para registrar checklists y anomalías.
            </p>
            <div style={s.turnoGrid}>
              {(['mañana', 'tarde', 'noche'] as TipoTurno[]).map(t => (
                <button key={t} style={s.btnTurno} onClick={() => handleAbrirTurno(t)}>
                  <span style={s.turnoIcon}>
                    {t === 'mañana' ? <Sunrise size={24} /> : t === 'tarde' ? <Sun size={24} /> : <Moon size={24} />}
                  </span>
                  {TURNO_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ ...s.card, borderLeft: '4px solid #1D9E75' }}>
            <div style={s.turnoActivo}>
              <div>
                <div style={s.turnoActivoLabel}>Turno activo</div>
                <div style={s.turnoActivoTipo}>
                  {TURNO_LABELS[turnoActivo!.tipo]}
                </div>
                <div style={s.turnoActivoSince}>
                  Iniciado {formatRelativo(turnoActivo!.inicio)}
                </div>
              </div>
              <div style={s.turnoActivoBadge}>ACTIVO</div>
            </div>
          </div>
        )}

        {/* ── Acceso rápido ── */}
        {hayTurnoAbierto && (
          <div style={s.quickRow}>
            <button style={s.quickBtn} onClick={() => navigate('/anomalias')}>
              <AlertTriangle size={20} color="#E24B4A" />
              Reportar anomalía
            </button>
          </div>
        )}

        {/* ── Mis tareas asignadas ── */}
        <MisTareasAsignadas />

        {/* ── Máquinas ── */}
        <div style={s.sectionHeader}>
          <h2 style={s.sectionTitle}>Máquinas</h2>
          {isLoading && <span style={{ fontSize: 12, color: '#8AADA6' }}>Cargando…</span>}
          {hayTurnoAbierto && checklistsTurno && (
            <span style={{ fontSize: 12, color: '#1D9E75', fontWeight: 600 }}>
              {checklistMap.size}/{maquinas?.length ?? 0} revisadas
            </span>
          )}
        </div>

        {maquinas?.map(maquina => (
          <MaquinaCard
            key={maquina.id}
            maquina={maquina}
            disabled={!hayTurnoAbierto}
            checklistRegistro={checklistMap.get(maquina.id)}
            onClick={() => navigate(`/checklist/${maquina.id}`)}
          />
        ))}

        {!isLoading && !maquinas?.length && (
          <p style={{ color: '#8AADA6', fontSize: 14, textAlign: 'center', marginTop: 32 }}>
            No hay máquinas registradas en el sistema.
          </p>
        )}
      </div>

      {showCerrarTurno && turnoActivo && (
        <ModalCerrarTurno
          turno={turnoActivo}
          onCancelar={() => setShowCerrarTurno(false)}
          onConfirmar={handleCerrarTurno}
        />
      )}
    </div>
  )
}

// ── Subcomponente: tarjeta de máquina ──────────────────────────

function MaquinaCard({
  maquina, disabled, onClick, checklistRegistro
}: {
  maquina: Maquina
  disabled: boolean
  onClick: () => void
  checklistRegistro?: ChecklistRegistro
}) {
  const color = ESTADO_MAQUINA_COLOR[maquina.estado_actual]
  const label = ESTADO_MAQUINA_LABEL[maquina.estado_actual]
  const yaRevisada = !!checklistRegistro

  const RESULTADO_COLOR: Record<string, string> = {
    ok:      '#1D9E75',
    revisar: '#EF9F27',
    critico: '#E24B4A',
  }
  const RESULTADO_LABEL: Record<string, string> = {
    ok:      'OK',
    revisar: 'Revisar',
    critico: 'Crítico',
  }

  return (
    <button
      style={{
        ...s.maquinaCard,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        borderColor: yaRevisada ? '#A7F3D0' : '#E2EFEB',
      }}
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled}
    >
      <div style={{ ...s.maquinaIndicator, background: color }} />
      <div style={s.maquinaInfo}>
        <div style={s.maquinaNombre}>{maquina.nombre}</div>
        <div style={s.maquinaMeta}>
          {maquina.area} · {maquina.codigo}
          {maquina.ultima_revision && (
            <> · Revisada {formatRelativo(maquina.ultima_revision)}</>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <span style={{ ...s.badge, background: color + '22', color }}>{label}</span>
        {yaRevisada && (
          <span style={{
            ...s.badge,
            background: RESULTADO_COLOR[checklistRegistro.resultado_general] + '18',
            color: RESULTADO_COLOR[checklistRegistro.resultado_general],
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <CheckCircle2 size={10} />
            {RESULTADO_LABEL[checklistRegistro.resultado_general]}
          </span>
        )}
      </div>

      {!yaRevisada && !disabled && (
        <span style={s.chevron}><ChevronRight size={18} /></span>
      )}
    </button>
  )
}

function ModalCerrarTurno({
  turno, onCancelar, onConfirmar
}: {
  turno: { tipo: string; inicio: string }
  onCancelar: () => void
  onConfirmar: () => void
}) {
  const [isPending, setIsPending] = useState(false)

  async function handleConfirmar() {
    setIsPending(true)
    await onConfirmar()
    setIsPending(false)
  }

  return (
    <div style={s.overlay} onClick={onCancelar}>
      <div style={{ ...s.modal, maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <div style={s.ctHeader}>
          <div style={s.ctIconWrap}>
            <Clock size={26} color="#0F6E56" strokeWidth={2} />
          </div>
          <div style={s.ctTitle}>Cerrar turno</div>
          <div style={s.ctSub}>¿Confirmas el cierre del turno activo?</div>
        </div>
        <div style={s.ctBody}>
          <div style={s.ctInfo}>
            <div style={s.ctTurnoLabel}>Turno activo</div>
            <div style={s.ctTurnoTipo}>{TURNO_LABELS[turno.tipo as import('@/types').TipoTurno]}</div>
            <div style={s.ctTurnoSince}>Iniciado {formatRelativo(turno.inicio)}</div>
          </div>
          <p style={s.ctWarning}>
            <LogOut size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            No podrás registrar nuevas anomalías ni checklists hasta abrir un nuevo turno.
          </p>
          <div style={s.ctBtns}>
            <button style={s.btnCancelarCt} onClick={onCancelar} disabled={isPending}>
              Cancelar
            </button>
            <button
              style={{ ...s.btnConfirmarCt, opacity: isPending ? 0.7 : 1 }}
              onClick={handleConfirmar}
              disabled={isPending}
            >
              {isPending ? 'Cerrando…' : 'Sí, cerrar turno'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MisTareasAsignadas() {
  const { usuario } = useAuth()
  const [selectedTarea, setSelectedTarea] = useState<Anomalia | null>(null)
  
  const { data: tareas, isLoading, error } = useQuery({
    queryKey: ['anomalias', 'asignadas', usuario?.id],
    queryFn: () => getAnomalias({ asignadoA: usuario?.id, estado: ['abierta', 'en_revision'] }),
    enabled: !!usuario?.id
  })

  if (error) {
    console.error('Error fetching tareas:', error)
    return <div style={{ color: 'red' }}>Error cargando tareas asignadas: {String(error)}</div>
  }
  if (isLoading) return <div style={{ color: '#8AADA6' }}>Cargando tareas asignadas...</div>
  if (!tareas || tareas.length === 0) return null

  return (
    <div style={{ marginTop: 8 }}>
      <h2 style={s.sectionTitle}>
        <ClipboardList size={18} style={{ marginRight: 6 }} />
        Tareas asignadas a ti
      </h2>
      <p style={{ fontSize: 12, color: '#5A7A72', marginTop: 4, marginBottom: 8 }}>
        El supervisor te ha asignado las siguientes anomalías para revisar o reparar.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tareas.map(tarea => {
          const color = SEVERIDAD_COLOR[tarea.severidad]
          return (
            <div key={tarea.id} style={s.tareaCard} onClick={() => setSelectedTarea(tarea)}>
              <div style={{ ...s.tareaIndicator, background: color }} />
              <div style={s.tareaInfo}>
                <div style={s.tareaTitle}>{tarea.maquina?.nombre ?? 'Máquina'} - {tarea.descripcion}</div>
                <div style={s.tareaMeta}>
                  {tarea.categoria && (
                    <span style={{ color: CATEGORIA_COLOR[tarea.categoria], fontWeight: 600 }}>
                      {CATEGORIA_LABEL[tarea.categoria]}
                    </span>
                  )}
                  {tarea.categoria ? ' · ' : ''}Severidad {tarea.severidad} · {formatRelativo(tarea.creado_en)}
                </div>
              </div>
              <span style={{ ...s.badge, background: color + '22', color }}>
                {ESTADO_ANOM_LABEL[tarea.estado]}
              </span>
            </div>
          )
        })}
      </div>

      {selectedTarea && (
        <ModalVerTarea tarea={selectedTarea} onClose={() => setSelectedTarea(null)} />
      )}
    </div>
  )
}

function ModalVerTarea({ tarea, onClose }: { tarea: Anomalia, onClose: () => void }) {
  const qc = useQueryClient()
  const { usuario } = useAuth()
  const addToast = useUIStore(s => s.addToast)
  const [comentario, setComentario] = useState('')

  const actualizar = useMutation({
    mutationFn: (dto: { estado: 'resuelta', comentario?: string }) => 
      actualizarAnomalia(tarea.id, usuario!.id, { estado: dto.estado, asignado_a: tarea.asignado_a ?? undefined, comentario: dto.comentario }),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Tarea marcada como resuelta' })
      qc.invalidateQueries({ queryKey: ['anomalias'] })
      onClose()
    },
    onError: (err) => {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Error al actualizar' })
    }
  })

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div style={s.modalTitle}>Detalles de la tarea</div>
          <button style={s.modalClose} onClick={onClose}><X size={20} /></button>
        </div>

        <div style={s.modalBody}>
          <div style={s.detRow}><span style={s.detLabel}>Máquina</span><span>{tarea.maquina?.nombre}</span></div>
          <div style={s.detRow}><span style={s.detLabel}>Severidad</span>
            <span style={{ color: SEVERIDAD_COLOR[tarea.severidad], fontWeight: 600 }}>
              {SEVERIDAD_LABEL[tarea.severidad]}
            </span>
          </div>
          <div style={s.detRow}><span style={s.detLabel}>Reportada</span><span>{formatFecha(tarea.creado_en)}</span></div>
          {tarea.categoria && (
            <div style={s.detRow}><span style={s.detLabel}>Categoría</span>
              <span style={{ color: CATEGORIA_COLOR[tarea.categoria], fontWeight: 600 }}>
                {CATEGORIA_LABEL[tarea.categoria]}
              </span>
            </div>
          )}
          <div style={s.desc}>{tarea.descripcion}</div>

          {tarea.historial && tarea.historial.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <label style={s.label}>Bitácora e instrucciones</label>
              <div style={s.timeline}>
                {tarea.historial.map(h => (
                  <div key={h.id} style={s.tlItem}>
                    <div style={s.tlDot} />
                    <div style={s.tlContent}>
                      <div style={s.tlTop}>
                        <span style={{...s.tlEstado, color: h.estado_nuevo === 'resuelta' ? '#1D9E75' : '#0F2621'}}>
                          {ESTADO_ANOM_LABEL[h.estado_nuevo] || h.estado_nuevo.replace('_', ' ')}
                        </span>
                        <span style={s.tlFecha}>{formatRelativo(h.cambiado_en)}</span>
                      </div>
                      <div style={s.tlUser}>Por: {h.usuario?.nombre ?? 'Desconocido'}</div>
                      {h.comentario && <div style={s.tlComentario}>"{h.comentario}"</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #E2EFEB' }}>
            <label style={s.label}>Reportar solución</label>
            <textarea
              style={s.textarea}
              rows={3}
              placeholder="Escribe aquí lo que hiciste para solucionar la falla..."
              value={comentario}
              onChange={e => setComentario(e.target.value)}
            />
            <button 
              style={{ ...s.btnResolver, opacity: actualizar.isPending ? 0.7 : 1 }}
              onClick={() => actualizar.mutate(
                { estado: 'resuelta', comentario: comentario.trim() || undefined },
                { onSuccess: () => onClose() }
              )}
              disabled={actualizar.isPending}
            >
              {actualizar.isPending ? 'Guardando...' : 'Marcar como resuelta'}
            </button>
          </div>

          <button style={s.btnCerrarModal} onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

// ── Estilos ────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100dvh', background: '#F0FAF6', fontFamily: 'system-ui, sans-serif' },
  topbar: {
    background: '#1D9E75', padding: '14px 16px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  topbarLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36, height: 36, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 700, fontSize: 14,
  },
  topbarName: { color: '#fff', fontWeight: 600, fontSize: 14 },
  topbarRole: { color: '#9FE1CB', fontSize: 11, textTransform: 'capitalize' },
  btnCerrar: {
    background: 'rgba(255,255,255,0.15)', color: '#fff',
    border: '1px solid rgba(255,255,255,0.4)', borderRadius: 8,
    padding: '6px 12px', fontSize: 12, cursor: 'pointer',
  },
  body: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 600, margin: '0 auto' },
  card: {
    background: '#fff', borderRadius: 12, padding: '16px',
    boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
  },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  sectionTitle: { display: 'flex', alignItems: 'center', fontSize: 15, fontWeight: 600, color: '#0F2621', margin: 0 },
  turnoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 },
  btnTurno: {
    background: '#F0FAF6', border: '1px solid #C8DED9', borderRadius: 10,
    padding: '12px 8px', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#0F2621',
  },
  turnoIcon: { display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1D9E75' },
  turnoActivo: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  turnoActivoLabel: { fontSize: 11, color: '#1D9E75', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  turnoActivoTipo:  { fontSize: 18, fontWeight: 700, color: '#0F2621' },
  turnoActivoSince: { fontSize: 12, color: '#5A7A72', marginTop: 2 },
  turnoActivoBadge: {
    background: '#E1F5EE', color: '#085041', fontSize: 11, fontWeight: 700,
    padding: '4px 10px', borderRadius: 99, letterSpacing: '0.05em',
  },
  quickRow: { display: 'flex', gap: 8 },
  quickBtn: {
    flex: 1, background: '#fff', border: '1px solid #C8DED9', borderRadius: 10,
    padding: '12px', display: 'flex', alignItems: 'center', gap: 8,
    cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#0F2621',
  },
  maquinaCard: {
    background: '#fff', borderRadius: 12, padding: '14px 16px',
    display: 'flex', alignItems: 'center', gap: 12,
    border: '1px solid #E2EFEB', width: '100%', textAlign: 'left',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'box-shadow 0.15s',
  },
  maquinaIndicator: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  maquinaInfo: { flex: 1, minWidth: 0 },
  maquinaNombre: { fontSize: 14, fontWeight: 600, color: '#0F2621', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  maquinaMeta:   { fontSize: 11, color: '#5A7A72', marginTop: 2 },
  
  tareaCard: {
    background: '#fff', borderRadius: 12, padding: '12px 14px',
    display: 'flex', alignItems: 'flex-start', gap: 12, border: '1px solid #1D9E75',
    boxShadow: '0 2px 8px rgba(29,158,117,0.1)', cursor: 'pointer', transition: 'transform 0.15s',
  },
  tareaIndicator: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4 },
  tareaInfo: { flex: 1, minWidth: 0 },
  tareaTitle: { fontSize: 13, fontWeight: 600, color: '#0F2621', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  tareaMeta: { fontSize: 11, color: '#5A7A72', marginTop: 4, textTransform: 'capitalize' },
  
  badge: { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, whiteSpace: 'nowrap' },
  chevron: { color: '#8AADA6', flexShrink: 0, display: 'flex', alignItems: 'center' },
  
  // Modal operator
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' },
  modal:       { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '90dvh', overflow: 'auto' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid #E2EFEB' },
  modalTitle:  { fontSize: 16, fontWeight: 700, color: '#0F2621' },
  modalClose:  { background: 'transparent', border: 'none', fontSize: 18, color: '#5A7A72', cursor: 'pointer' },
  modalBody:   { padding: 16, display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 32 },
  detRow:      { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#0F2621' },
  detLabel:    { color: '#5A7A72' },
  desc:        { background: '#F0FAF6', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#0F2621', border: '1px solid #C8DED9' },
  label:       { fontSize: 12, fontWeight: 600, color: '#2D4A42', marginTop: 4, display: 'block', marginBottom: 4 },
  textarea:    { width: '100%', border: '1px solid #C8DED9', borderRadius: 8, padding: '10px 12px', fontSize: 13, resize: 'none', fontFamily: 'system-ui, sans-serif', color: '#0F2621', boxSizing: 'border-box' },
  btnResolver: { width: '100%', background: '#1D9E75', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', marginTop: 12 },
  btnCerrarModal:{ width: '100%', background: '#E2EFEB', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, color: '#0F2621', cursor: 'pointer', marginTop: 8 },

  // Timeline
  timeline:    { display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10, borderLeft: '2px solid #E2EFEB', paddingLeft: 14, marginLeft: 6 },
  tlItem:      { position: 'relative' },
  tlDot:       { position: 'absolute', left: -21, top: 4, width: 10, height: 10, borderRadius: '50%', background: '#8AADA6', border: '2px solid #fff' },
  tlContent:   { background: '#F8FAFC', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2EFEB' },
  tlTop:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  tlEstado:    { fontSize: 12, fontWeight: 700, textTransform: 'capitalize' },
  tlFecha:     { fontSize: 11, color: '#8AADA6' },
  tlUser:      { fontSize: 11, color: '#5A7A72', marginTop: 2 },
  tlComentario:{ fontSize: 12, color: '#2D4A42', fontStyle: 'italic', marginTop: 4, background: '#fff', padding: '6px 8px', borderRadius: 6, border: '1px dashed #C8DED9' },

  // Cerrar turno modal
  ctHeader:     { background: 'linear-gradient(135deg, #0F6E56 0%, #1D9E75 100%)', padding: '28px 20px 16px', borderRadius: '16px 16px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  ctIconWrap:   { width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  ctTitle:      { fontSize: 17, fontWeight: 700, color: '#fff' },
  ctSub:        { fontSize: 12, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  ctBody:       { padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: 14 },
  ctInfo:       { background: '#F0FAF6', border: '1px solid #C8DED9', borderRadius: 10, padding: '14px 16px' },
  ctTurnoLabel: { fontSize: 11, color: '#1D9E75', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  ctTurnoTipo:  { fontSize: 20, fontWeight: 700, color: '#0F2621', marginTop: 2 },
  ctTurnoSince: { fontSize: 12, color: '#5A7A72', marginTop: 2 },
  ctWarning:    { fontSize: 12, color: '#5A7A72', background: '#F8FAFC', border: '1px solid #E2EFEB', borderRadius: 8, padding: '10px 12px', margin: 0, lineHeight: 1.5 },
  ctBtns:       { display: 'flex', gap: 10 },
  btnCancelarCt:{ flex: 1, background: '#F8FAFC', border: '1px solid #C8DED9', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 600, color: '#5A7A72', cursor: 'pointer' },
  btnConfirmarCt:{ flex: 1, background: '#0F6E56', border: 'none', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', transition: 'opacity 0.15s' },
}
