import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useUIStore } from '@/store'
import { getAnomalias, actualizarAnomalia } from '@/api/anomalias'
import { getOperadores } from '@/api/usuarios'
import {
  SEVERIDAD_COLOR, SEVERIDAD_LABEL,
  ESTADO_ANOM_LABEL,
  CATEGORIA_LABEL,
  CATEGORIA_COLOR,
} from '@/lib/constants'
import { formatFecha, formatRelativo } from '@/lib/utils'
import type { EstadoAnom, Anomalia } from '@/types'
import GestorUsuarios from '@/components/admin/GestorUsuarios'
import GestorMaquinas from '@/components/supervisor/GestorMaquinas'
import ReporteMaquinas from '@/components/supervisor/ReporteMaquinas'
import HistorialChecklists from '@/components/supervisor/HistorialChecklists'
import Preventivo from '@/components/supervisor/Preventivo'

type Tab = 'anomalias' | 'checklists' | 'preventivo' | 'reportes' | 'maquinas' | 'usuarios'

export default function SupervisorPage() {
  const { usuario, logout, esAdmin } = useAuth()
  const addToast = useUIStore(s => s.addToast)
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('anomalias')
  const [selected, setSelected] = useState<Anomalia | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<'activas' | 'todas'>('activas')

  const { data: anomalias, isLoading: loadingAnom } = useQuery({
    queryKey: ['anomalias', 'supervisor'],
    queryFn: () => getAnomalias({ limit: 100 }),
    refetchInterval: 30_000, // refresh cada 30s
  })


  const { data: operadores } = useQuery({ queryKey: ['operadores'], queryFn: getOperadores })

  const actualizar = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: { estado: EstadoAnom; asignado_a?: string; comentario?: string } }) =>
      actualizarAnomalia(id, usuario!.id, dto),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Anomalía actualizada' })
      qc.invalidateQueries({ queryKey: ['anomalias'] })
      setSelected(null)
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Error al actualizar'
      addToast({ type: 'error', message: msg })
    },
  })

  // Stats
  const abiertas = anomalias?.filter(a => a.estado === 'abierta').length ?? 0
  const enRevision = anomalias?.filter(a => a.estado === 'en_revision').length ?? 0
  const altas = anomalias?.filter(a => a.severidad === 'alta' && a.estado !== 'resuelta').length ?? 0

  return (
    <div style={s.page}>
      {/* ── Topbar ── */}
      <div style={s.topbar}>
        <div>
          <div style={s.topbarTitle}>Panel Supervisor</div>
          <div style={s.topbarSub}>{usuario?.nombre}</div>
        </div>
        <button style={s.btnLogout} onClick={logout}>Salir</button>
      </div>

      {/* ── Stats ── */}
      <div style={s.statsRow}>
        <Stat label="Abiertas" value={abiertas} color="#EF9F27" />
        <Stat label="En revisión" value={enRevision} color="#3B82F6" />
        <Stat label="Alta severidad" value={altas} color="#E24B4A" />
      </div>

      {/* ── Tabs ── */}
      <div style={s.tabRow}>
        <button style={{ ...s.tab, ...(tab === 'anomalias' ? s.tabActive : {}) }} onClick={() => setTab('anomalias')}>
          Anomalías
        </button>
        <button style={{ ...s.tab, ...(tab === 'checklists' ? s.tabActive : {}) }} onClick={() => setTab('checklists')}>
          Checklists
        </button>
        <button style={{ ...s.tab, ...(tab === 'preventivo' ? s.tabActive : {}) }} onClick={() => setTab('preventivo')}>
          Preventivo
        </button>
        <button style={{ ...s.tab, ...(tab === 'reportes' ? s.tabActive : {}) }} onClick={() => setTab('reportes')}>
          Reportes
        </button>
        <button style={{ ...s.tab, ...(tab === 'maquinas' ? s.tabActive : {}) }} onClick={() => setTab('maquinas')}>
          Máquinas
        </button>
        {esAdmin && (
          <button style={{ ...s.tab, ...(tab === 'usuarios' ? s.tabActive : {}) }} onClick={() => setTab('usuarios')}>
            Usuarios
          </button>
        )}
      </div>

      <div style={s.body}>

        {/* ── Tab Anomalías ── */}
        {tab === 'anomalias' && (
          <>
            {/* Filtro estado */}
            <div style={s.filtroRow}>
              <button
                style={{ ...s.filtroBtn, ...(filtroEstado === 'activas' ? s.filtroActive : {}) }}
                onClick={() => setFiltroEstado('activas')}
              >
                Activas
              </button>
              <button
                style={{ ...s.filtroBtn, ...(filtroEstado === 'todas' ? s.filtroActive : {}) }}
                onClick={() => setFiltroEstado('todas')}
              >
                Todas (historial)
              </button>
            </div>

            {loadingAnom && <p style={{ color: '#8AADA6', textAlign: 'center' }}>Cargando…</p>}
            {anomalias
              ?.filter(a => filtroEstado === 'activas'
                ? a.estado !== 'resuelta' && a.estado !== 'descartada'
                : true
              )
              .map(a => {
                const color = SEVERIDAD_COLOR[a.severidad]
                const resuelta = a.estado === 'resuelta' || a.estado === 'descartada'
                return (
                  <button key={a.id} style={{ ...s.anomCard, opacity: resuelta ? 0.6 : 1 }} onClick={() => setSelected(a)}>
                    <div style={{ ...s.anomBorder, background: resuelta ? '#94a3b8' : color }} />
                    <div style={s.anomBody}>
                      <div style={s.anomTop}>
                        <span style={s.anomMaquina}>{a.maquina?.nombre ?? '—'}</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {a.categoria && (
                            <span style={{ ...s.badge, background: CATEGORIA_COLOR[a.categoria] + '22', color: CATEGORIA_COLOR[a.categoria] }}>
                              {CATEGORIA_LABEL[a.categoria]}
                            </span>
                          )}
                          <span style={{ ...s.badge, background: color + '22', color }}>
                            {SEVERIDAD_LABEL[a.severidad]}
                          </span>
                        </div>
                      </div>
                      <div style={s.anomDesc}>{a.descripcion}</div>
                      <div style={s.anomMeta}>
                        <span style={{
                          fontWeight: 600,
                          color: resuelta ? '#1D9E75' : a.estado === 'en_revision' ? '#3B82F6' : '#EF9F27'
                        }}>
                          {ESTADO_ANOM_LABEL[a.estado]}
                        </span>
                        {' · '}{formatRelativo(a.creado_en)}
                        {a.asignado_a_usuario && <span style={{ color: '#5A7A72' }}>{' · '}👤 {a.asignado_a_usuario.nombre}</span>}
                      </div>
                    </div>
                  </button>
                )
              })
            }
          </>
        )}

        {/* ── Tab Máquinas ── */}
        {tab === 'maquinas' && <GestorMaquinas />}

        {/* ── Tab Usuarios (Solo Admin) ── */}
        {tab === 'usuarios' && esAdmin && <GestorUsuarios />}

        {/* ── Tab Preventivo ── */}
        {tab === 'preventivo' && <Preventivo />}

        {/* ── Tab Reportes ── */}
        {tab === 'reportes' && <ReporteMaquinas />}

        {/* ── Tab Checklists ── */}
        {tab === 'checklists' && <HistorialChecklists />}

      </div>

      {/* ── Modal de anomalía ── */}
      {selected && (
        <AnomaliaModal
          anomalia={selected}
          operadores={operadores ?? []}
          onClose={() => setSelected(null)}
          onActualizar={(estado, asignadoA, comentario) =>
            actualizar.mutate(
              { id: selected.id, dto: { estado, asignado_a: asignadoA, comentario } },
              { onSuccess: () => setSelected(null) }
            )
          }
          isPending={actualizar.isPending}
        />
      )}
    </div>
  )
}

// ── Subcomponentes ─────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={s.statCard}>
      <div style={{ ...s.statNum, color }}>{value}</div>
      <div style={s.statLabel}>{label}</div>
    </div>
  )
}

function AnomaliaModal({
  anomalia, operadores, onClose, onActualizar, isPending
}: {
  anomalia: Anomalia
  operadores: { id: string; nombre: string }[]
  onClose: () => void
  onActualizar: (estado: EstadoAnom, asignadoA?: string, comentario?: string) => void
  isPending: boolean
}) {
  const [estado, setEstado] = useState<EstadoAnom>(anomalia.estado)
  const [asignadoA, setAsignadoA] = useState(anomalia.asignado_a ?? '')
  const [comentario, setComentario] = useState('')

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div style={s.modalTitle}>Gestionar anomalía</div>
          <button style={s.modalClose} onClick={onClose}>✕</button>
        </div>

        <div style={s.modalBody}>
          <div style={s.detRow}><span style={s.detLabel}>Máquina</span><span>{anomalia.maquina?.nombre}</span></div>
          <div style={s.detRow}><span style={s.detLabel}>Reportada</span><span>{formatFecha(anomalia.creado_en)}</span></div>
          <div style={s.detRow}><span style={s.detLabel}>Severidad</span>
            <span style={{ color: SEVERIDAD_COLOR[anomalia.severidad], fontWeight: 600 }}>
              {SEVERIDAD_LABEL[anomalia.severidad]}
            </span>
          </div>

          <div style={s.desc}>{anomalia.descripcion}</div>

          {/* Estado */}
          <label style={s.label}>Cambiar estado</label>
          <select style={s.select} value={estado} onChange={e => setEstado(e.target.value as EstadoAnom)}>
            <option value="abierta">Abierta</option>
            <option value="en_revision">En revisión</option>
            <option value="resuelta">Resuelta</option>
            <option value="descartada">Descartada</option>
          </select>

          {/* Asignar técnico */}
          <label style={s.label}>Asignar a</label>
          <select style={s.select} value={asignadoA} onChange={e => setAsignadoA(e.target.value)}>
            <option value="">Sin asignar</option>
            {operadores.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>

          {/* Comentario */}
          <label style={s.label}>Comentario</label>
          <textarea
            style={s.textarea}
            rows={3}
            placeholder="Notas sobre la acción tomada…"
            value={comentario}
            onChange={e => setComentario(e.target.value)}
          />

          <button
            style={{ ...s.btnGuardar, opacity: isPending ? 0.7 : 1 }}
            disabled={isPending}
            onClick={() => onActualizar(estado, asignadoA || undefined, comentario || undefined)}
          >
            {isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>

          {/* ── Historial de estados ── */}
          {anomalia.historial && anomalia.historial.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <label style={s.label}>Bitácora de cambios</label>
              <div style={s.timeline}>
                {anomalia.historial.map(h => (
                  <div key={h.id} style={s.tlItem}>
                    <div style={s.tlDot} />
                    <div style={s.tlContent}>
                      <div style={s.tlTop}>
                        <span style={{ ...s.tlEstado, color: h.estado_nuevo === 'resuelta' ? '#1D9E75' : '#0F2621' }}>
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
        </div>
      </div>
    </div>
  )
}

// ── Estilos ────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100dvh', background: '#F0FAF6', fontFamily: 'system-ui, sans-serif' },
  topbar: { background: '#0F6E56', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  topbarTitle: { color: '#fff', fontWeight: 700, fontSize: 16 },
  topbarSub: { color: '#9FE1CB', fontSize: 12 },
  btnLogout: { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
  statsRow: { display: 'flex', gap: 0, background: '#fff', borderBottom: '1px solid #E2EFEB' },
  statCard: { flex: 1, textAlign: 'center', padding: '14px 8px', borderRight: '1px solid #E2EFEB' },
  statNum: { fontSize: 24, fontWeight: 700 },
  statLabel: { fontSize: 11, color: '#5A7A72', marginTop: 2 },
  tabRow: { display: 'flex', background: '#fff', borderBottom: '1px solid #E2EFEB', overflowX: 'auto', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch' },
  tab: { flex: '1 0 auto', padding: '14px 16px', border: 'none', background: 'transparent', fontSize: 14, color: '#5A7A72', cursor: 'pointer', fontWeight: 500 },
  tabActive: { color: '#1D9E75', borderBottom: '2px solid #1D9E75', fontWeight: 700 },
  body: { padding: 16, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 700, margin: '0 auto' },
  anomCard: { background: '#fff', borderRadius: 12, display: 'flex', border: '1px solid #E2EFEB', overflow: 'hidden', textAlign: 'left', cursor: 'pointer', width: '100%', transition: 'opacity 0.15s' },
  maqCard: { background: '#fff', borderRadius: 12, display: 'flex', border: '1px solid #E2EFEB', overflow: 'hidden' },
  anomBorder: { width: 5, flexShrink: 0 },
  anomBody: { flex: 1, padding: '12px 14px' },
  anomTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  anomMaquina: { fontSize: 14, fontWeight: 700, color: '#0F2621' },
  anomDesc: { fontSize: 12, color: '#2D4A42', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  anomMeta: { fontSize: 11, color: '#8AADA6', marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 2 },
  badge: { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99 },
  filtroRow: { display: 'flex', gap: 8 },
  filtroBtn: { background: '#fff', border: '1px solid #E2EFEB', borderRadius: 20, padding: '6px 14px', fontSize: 12, color: '#5A7A72', cursor: 'pointer', fontWeight: 500 },
  filtroActive: { background: '#1D9E75', color: '#fff', borderColor: '#1D9E75', fontWeight: 700 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' },
  modal: { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '90dvh', overflow: 'auto' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid #E2EFEB' },
  modalTitle: { fontSize: 16, fontWeight: 700, color: '#0F2621' },
  modalClose: { background: 'transparent', border: 'none', fontSize: 18, color: '#5A7A72', cursor: 'pointer' },
  modalBody: { padding: 16, display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 32 },
  detRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#0F2621' },
  detLabel: { color: '#5A7A72' },
  desc: { background: '#F0FAF6', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#0F2621', border: '1px solid #C8DED9' },
  label: { fontSize: 12, fontWeight: 600, color: '#2D4A42', marginTop: 4 },
  select: { border: '1px solid #C8DED9', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#0F2621', background: '#fff' },
  textarea: { border: '1px solid #C8DED9', borderRadius: 8, padding: '10px 12px', fontSize: 13, resize: 'none', fontFamily: 'system-ui, sans-serif', color: '#0F2621' },
  btnGuardar: { background: '#1D9E75', border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer', transition: 'opacity 0.15s', marginTop: 4 },

  // Timeline
  timeline: { display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10, borderLeft: '2px solid #E2EFEB', paddingLeft: 14, marginLeft: 6 },
  tlItem: { position: 'relative' },
  tlDot: { position: 'absolute', left: -21, top: 4, width: 10, height: 10, borderRadius: '50%', background: '#8AADA6', border: '2px solid #fff' },
  tlContent: { background: '#F8FAFC', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2EFEB' },
  tlTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  tlEstado: { fontSize: 12, fontWeight: 700, textTransform: 'capitalize' },
  tlFecha: { fontSize: 11, color: '#8AADA6' },
  tlUser: { fontSize: 11, color: '#5A7A72', marginTop: 2 },
  tlComentario: { fontSize: 12, color: '#2D4A42', fontStyle: 'italic', marginTop: 4, background: '#fff', padding: '6px 8px', borderRadius: 6, border: '1px dashed #C8DED9' },
}
