import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useUIStore } from '@/store'
import { getTodasLasMaquinas } from '@/api/maquinas'
import {
  getPlanes, crearPlan, eliminarPlan,
  getMantenimientos, completarMantenimiento, omitirMantenimiento, programarMantenimiento,
  type CrearPlanDTO,
} from '@/api/preventivo'
import type { PlanPreventivo, MantenimientoPreventivo, Maquina } from '@/types'
import {
  CalendarCheck2, Plus, ChevronRight, X, CheckCircle2,
  Clock, SkipForward, Calendar, Filter, Repeat2, Tag
} from 'lucide-react'
import { CATEGORIA_LABEL, CATEGORIA_COLOR } from '@/lib/constants'

// ── Constantes ──────────────────────────────────────────────────
const FRECUENCIA_LABEL: Record<string, string> = {
  diaria:   'Diaria',
  semanal:  'Semanal',
  mensual:  'Mensual',
}
const FRECUENCIA_COLOR: Record<string, string> = {
  diaria:   '#6366F1',
  semanal:  '#3B82F6',
  mensual:  '#1D9E75',
}
const ESTADO_COLOR: Record<string, string> = {
  programado: '#EF9F27',
  completado: '#1D9E75',
  omitido:    '#94a3b8',
}
const ESTADO_LABEL: Record<string, string> = {
  programado: 'Programado',
  completado: 'Completado',
  omitido:    'Omitido',
}

function diasHasta(fecha: string): number {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const target = new Date(fecha + 'T00:00:00')
  return Math.round((target.getTime() - hoy.getTime()) / 86400000)
}

function urgenciaBadge(dias: number) {
  if (dias < 0)  return { label: `Vencido (${Math.abs(dias)}d)`, color: '#E24B4A', bg: '#FEF2F2' }
  if (dias === 0) return { label: 'Hoy',                          color: '#E24B4A', bg: '#FEF2F2' }
  if (dias <= 3)  return { label: `En ${dias}d`,                  color: '#EF9F27', bg: '#FFF7E6' }
  return { label: `En ${dias}d`, color: '#1D9E75', bg: '#E8F8F2' }
}

// ── Componente principal ──────────────────────────────────────
type Vista = 'planes' | 'cronograma' | 'historial'

export default function Preventivo() {
  const { usuario } = useAuth()
  const addToast = useUIStore(s => s.addToast)
  const qc = useQueryClient()

  const [vista, setVista] = useState<Vista>('planes')
  const [maquinaFiltro, setMaquinaFiltro] = useState<string>('')
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('')
  const [showCrear, setShowCrear] = useState(false)
  const [planSeleccionado, setPlanSeleccionado] = useState<PlanPreventivo | null>(null)
  const [mantenSeleccionado, setMantenSeleccionado] = useState<MantenimientoPreventivo | null>(null)

  const { data: maquinas } = useQuery({ queryKey: ['maquinas', 'admin'], queryFn: getTodasLasMaquinas })

  const { data: planes, isLoading: loadingPlanes } = useQuery({
    queryKey: ['planes-preventivos', maquinaFiltro, categoriaFiltro],
    queryFn: () => getPlanes(maquinaFiltro || undefined, categoriaFiltro || undefined),
  })

  // Próximos 60 días para el cronograma
  const desde = new Date(); desde.setHours(0, 0, 0, 0)
  const hasta = new Date(); hasta.setDate(hasta.getDate() + 60)

  const { data: mantenimientos, isLoading: loadingMant } = useQuery({
    queryKey: ['mantenimientos', maquinaFiltro, categoriaFiltro, vista],
    queryFn: () => {
      if (vista === 'cronograma') {
        return getMantenimientos({
          maquinaId: maquinaFiltro || undefined,
          categoria: categoriaFiltro || undefined,
          desde: desde.toISOString().slice(0, 10),
          hasta: hasta.toISOString().slice(0, 10),
        })
      } else {
        // Historial
        return getMantenimientos({
          maquinaId: maquinaFiltro || undefined,
          categoria: categoriaFiltro || undefined,
          estados: ['completado', 'omitido'],
        })
      }
    },
    enabled: vista === 'cronograma' || vista === 'historial',
  })

  const crearMutation = useMutation({
    mutationFn: (dto: CrearPlanDTO) => crearPlan(usuario!.id, dto),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Plan creado exitosamente' })
      qc.invalidateQueries({ queryKey: ['planes-preventivos'] })
      setShowCrear(false)
    },
    onError: () => addToast({ type: 'error', message: 'Error al crear el plan' }),
  })

  const eliminarMutation = useMutation({
    mutationFn: eliminarPlan,
    onSuccess: () => {
      addToast({ type: 'success', message: 'Plan desactivado' })
      qc.invalidateQueries({ queryKey: ['planes-preventivos'] })
      setPlanSeleccionado(null)
    },
  })

  const completarMutation = useMutation({
    mutationFn: ({ id, obs }: { id: string; obs?: string }) =>
      completarMantenimiento(id, usuario!.id, obs),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Mantenimiento marcado como completado' })
      qc.invalidateQueries({ queryKey: ['mantenimientos'] })
      setMantenSeleccionado(null)
    },
  })

  const omitirMutation = useMutation({
    mutationFn: ({ id, obs }: { id: string; obs?: string }) => omitirMantenimiento(id, obs),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Mantenimiento omitido' })
      qc.invalidateQueries({ queryKey: ['mantenimientos'] })
      setMantenSeleccionado(null)
    },
  })

  const programarMutation = useMutation({
    mutationFn: ({ planId, maquinaId, fecha }: { planId: string; maquinaId: string; fecha: string }) =>
      programarMantenimiento(planId, maquinaId, fecha),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Mantenimiento programado' })
      qc.invalidateQueries({ queryKey: ['mantenimientos'] })
      setPlanSeleccionado(null)
    },
  })

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.headerIcon}><CalendarCheck2 size={22} /></div>
          <div>
            <h2 style={s.title}>Mantenimiento Preventivo</h2>
            <p style={s.subtitle}>Planifica y rastrea el mantenimiento programado de cada máquina</p>
          </div>
        </div>
        <button style={s.btnCrear} onClick={() => setShowCrear(true)}>
          <Plus size={16} /> Nuevo plan
        </button>
      </div>

      {/* Filtro máquina + categoría + toggle vista */}
      <div style={s.toolbar}>
        <div className="preventivo-filtros" style={s.selectWrap}>
          <Filter size={14} color="#5A7A72" style={{ flexShrink: 0 }} />
          <select
            style={s.select}
            value={maquinaFiltro}
            onChange={e => setMaquinaFiltro(e.target.value)}
          >
            <option value="">Todas las máquinas</option>
            {maquinas?.map(m => (
              <option key={m.id} value={m.id}>{m.nombre} ({m.codigo})</option>
            ))}
          </select>
          <div style={{ width: 1, height: 20, background: '#E2EFEB', margin: '0 4px' }} />
          <Tag size={14} color="#5A7A72" style={{ flexShrink: 0 }} />
          <select
            style={s.select}
            value={categoriaFiltro}
            onChange={e => setCategoriaFiltro(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {Object.entries(CATEGORIA_LABEL).map(([val, lbl]) => (
              <option key={val} value={val}>{lbl}</option>
            ))}
          </select>
        </div>

        <div className="preventivo-vistas" style={s.vistaTabs}>
          <button
            style={{ ...s.vistaBtn, ...(vista === 'planes' ? s.vistaBtnActive : {}) }}
            onClick={() => setVista('planes')}
          >
            <Repeat2 size={14} /> Planes
          </button>
          <button
            style={{ ...s.vistaBtn, ...(vista === 'cronograma' ? s.vistaBtnActive : {}) }}
            onClick={() => setVista('cronograma')}
          >
            <Calendar size={14} /> Cronograma
          </button>
          <button
            style={{ ...s.vistaBtn, ...(vista === 'historial' ? s.vistaBtnActive : {}) }}
            onClick={() => setVista('historial')}
          >
            <Clock size={14} /> Historial
          </button>
        </div>
      </div>

      {/* ── Vista: Planes activos ── */}
      {vista === 'planes' && (
        <div style={s.list}>
          {loadingPlanes && <p style={s.loadingText}>Cargando planes…</p>}
          {!loadingPlanes && planes?.length === 0 && (
            <div style={s.empty}>
              <CalendarCheck2 size={40} color="#C8DED9" />
              <p>No hay planes activos. Crea el primero con el botón "Nuevo plan".</p>
            </div>
          )}
          {planes?.map(plan => {
            const dias = diasHasta(plan.proxima_fecha)
            const urgencia = urgenciaBadge(dias)
            const fColor = FRECUENCIA_COLOR[plan.frecuencia]
            return (
              <button key={plan.id} style={s.planCard} onClick={() => setPlanSeleccionado(plan)}>
                <div style={{ ...s.planFreqBadge, background: fColor + '18', color: fColor }}>
                  <Repeat2 size={12} /> {FRECUENCIA_LABEL[plan.frecuencia]}
                </div>
                <div style={s.planBody}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <div style={s.planTitulo}>{plan.titulo}</div>
                    {plan.categoria && (
                      <div style={{ ...s.catBadge, color: CATEGORIA_COLOR[plan.categoria], background: CATEGORIA_COLOR[plan.categoria] + '18' }}>
                        {CATEGORIA_LABEL[plan.categoria]}
                      </div>
                    )}
                  </div>
                  <div style={s.planMeta}>{plan.maquina?.nombre} · {plan.maquina?.area}</div>
                  {plan.descripcion && (
                    <div style={s.planDesc}>{plan.descripcion}</div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ ...s.urgBadge, background: urgencia.bg, color: urgencia.color }}>
                    {urgencia.label}
                  </div>
                  <div style={s.proximaFecha}>{plan.proxima_fecha}</div>
                </div>
                <ChevronRight size={16} color="#8AADA6" style={{ flexShrink: 0 }} />
              </button>
            )
          })}
        </div>
      )}

      {/* ── Vista: Cronograma ── */}
      {vista === 'cronograma' && (
        <div style={s.list}>
          {loadingMant && <p style={s.loadingText}>Cargando cronograma…</p>}
          {!loadingMant && mantenimientos?.length === 0 && (
            <div style={s.empty}>
              <Calendar size={40} color="#C8DED9" />
              <p>No hay mantenimientos programados para los próximos 60 días.</p>
            </div>
          )}
          {[...(mantenimientos ?? [])].reverse().map(m => {
            const ec = ESTADO_COLOR[m.estado]
            const dias = diasHasta(m.fecha_programada)
            return (
              <button
                key={m.id}
                style={{ ...s.mantCard, borderLeftColor: ec, opacity: m.estado !== 'programado' ? 0.7 : 1 }}
                onClick={() => m.estado === 'programado' ? setMantenSeleccionado(m) : null}
              >
                <div style={s.mantLeft}>
                  <div style={s.mantFecha}>{m.fecha_programada}</div>
                  {m.estado === 'programado' && (
                    <div style={{ fontSize: 10, color: dias < 0 ? '#E24B4A' : '#8AADA6' }}>
                      {dias < 0 ? `Vencido ${Math.abs(dias)}d` : dias === 0 ? 'Hoy' : `Faltan ${dias}d`}
                    </div>
                  )}
                </div>
                <div style={s.mantBody}>
                  <div style={s.mantTitulo}>{m.plan?.titulo}</div>
                  <div style={s.mantMeta}>{m.maquina?.nombre} · {m.maquina?.area}</div>
                  {m.observaciones && (
                    <div style={s.mantObs}>"{m.observaciones}"</div>
                  )}
                </div>
                <div style={{ ...s.estadoBadge, background: ec + '18', color: ec }}>
                  {m.estado === 'completado' ? <CheckCircle2 size={12} /> : m.estado === 'omitido' ? <SkipForward size={12} /> : <Clock size={12} />}
                  {ESTADO_LABEL[m.estado]}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Vista: Historial ── */}
      {vista === 'historial' && (
        <div style={s.list}>
          {loadingMant && <p style={s.loadingText}>Cargando historial…</p>}
          {!loadingMant && mantenimientos?.length === 0 && (
            <div style={s.empty}>
              <Clock size={40} color="#C8DED9" />
              <p>No hay mantenimientos completados ni omitidos aún.</p>
            </div>
          )}
          {mantenimientos?.map(m => {
            const ec = ESTADO_COLOR[m.estado]
            return (
              <div key={m.id} style={{ ...s.mantCard, borderLeftColor: ec, cursor: 'default' }}>
                <div style={s.mantLeft}>
                  <div style={s.mantFecha}>{m.fecha_programada}</div>
                </div>
                <div style={s.mantBody}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <div style={s.mantTitulo}>{m.plan?.titulo}</div>
                    {m.plan?.categoria && (
                      <div style={{ ...s.catBadge, color: CATEGORIA_COLOR[m.plan.categoria], background: CATEGORIA_COLOR[m.plan.categoria] + '18' }}>
                        {CATEGORIA_LABEL[m.plan.categoria]}
                      </div>
                    )}
                  </div>
                  <div style={s.mantMeta}>{m.maquina?.nombre} · {m.maquina?.area}</div>
                  {m.observaciones && (
                    <div style={s.mantObs}>"{m.observaciones}"</div>
                  )}
                  {m.realizadoPor && (
                    <div style={{ fontSize: 10, color: '#8AADA6', marginTop: 4 }}>
                      Registrado por: {m.realizadoPor.nombre}
                    </div>
                  )}
                </div>
                <div style={{ ...s.estadoBadge, background: ec + '18', color: ec }}>
                  {m.estado === 'completado' ? <CheckCircle2 size={12} /> : <SkipForward size={12} />}
                  {ESTADO_LABEL[m.estado]}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal: Crear plan ── */}
      {showCrear && (
        <ModalCrearPlan
          maquinas={maquinas ?? []}
          isPending={crearMutation.isPending}
          onClose={() => setShowCrear(false)}
          onGuardar={dto => crearMutation.mutate(dto)}
        />
      )}

      {/* ── Modal: Detalle de plan ── */}
      {planSeleccionado && (
        <ModalDetallePlan
          plan={planSeleccionado}
          isPending={eliminarMutation.isPending || programarMutation.isPending}
          onClose={() => setPlanSeleccionado(null)}
          onEliminar={() => eliminarMutation.mutate(planSeleccionado.id)}
          onProgramar={(fecha) => programarMutation.mutate({
            planId: planSeleccionado.id,
            maquinaId: planSeleccionado.maquina_id,
            fecha,
          })}
        />
      )}

      {/* ── Modal: Completar / omitir mantenimiento ── */}
      {mantenSeleccionado && (
        <ModalAccionMantenimiento
          mantenimiento={mantenSeleccionado}
          isPending={completarMutation.isPending || omitirMutation.isPending}
          onClose={() => setMantenSeleccionado(null)}
          onCompletar={(obs) => completarMutation.mutate({ id: mantenSeleccionado.id, obs })}
          onOmitir={(obs) => omitirMutation.mutate({ id: mantenSeleccionado.id, obs })}
        />
      )}
    </div>
  )
}

// ── Modal: Crear Plan ─────────────────────────────────────────
function ModalCrearPlan({ maquinas, isPending, onClose, onGuardar }: {
  maquinas: Maquina[]
  isPending: boolean
  onClose: () => void
  onGuardar: (dto: CrearPlanDTO) => void
}) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [maquinaId,   setMaquinaId]   = useState('')
  const [titulo,      setTitulo]      = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoria,   setCategoria]   = useState<'mecanico'|'electrico'|'lubricacion'|'limpieza'|'general'|'otro'>('general')
  const [frecuencia,  setFrecuencia]  = useState<'diaria' | 'semanal' | 'mensual'>('semanal')
  const [proxima,     setProxima]     = useState(hoy)

  const puedeGuardar = maquinaId && titulo.trim().length >= 3 && proxima

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div style={s.modalTitle}>Nuevo plan preventivo</div>
          <button style={s.modalClose} onClick={onClose}><X size={20} /></button>
        </div>
        <div style={s.modalBody}>
          <label style={s.label}>Máquina</label>
          <select style={s.inp} value={maquinaId} onChange={e => setMaquinaId(e.target.value)}>
            <option value="">Selecciona una máquina…</option>
            {maquinas.map(m => <option key={m.id} value={m.id}>{m.nombre} ({m.codigo})</option>)}
          </select>

          <label style={s.label}>Título del plan</label>
          <input
            style={s.inp} value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder="Ej: Lubricación de rodamientos"
          />

          <label style={s.label}>Descripción (opcional)</label>
          <textarea
            style={{ ...s.inp, resize: 'none' }} rows={2}
            value={descripcion} onChange={e => setDescripcion(e.target.value)}
            placeholder="Pasos o instrucciones generales…"
          />

          <label style={s.label}>Categoría</label>
          <select style={s.inp} value={categoria} onChange={e => setCategoria(e.target.value as any)}>
            {Object.entries(CATEGORIA_LABEL).map(([val, lbl]) => (
              <option key={val} value={val}>{lbl}</option>
            ))}
          </select>

          <label style={s.label}>Frecuencia</label>
          <div style={s.freqRow}>
            {(['diaria', 'semanal', 'mensual'] as const).map(f => (
              <button
                key={f}
                style={{
                  ...s.freqBtn,
                  background: frecuencia === f ? FRECUENCIA_COLOR[f] : '#fff',
                  color:      frecuencia === f ? '#fff' : '#5A7A72',
                  borderColor: frecuencia === f ? FRECUENCIA_COLOR[f] : '#E2EFEB',
                }}
                onClick={() => setFrecuencia(f)}
              >
                {FRECUENCIA_LABEL[f]}
              </button>
            ))}
          </div>

          <label style={s.label}>Próxima fecha programada</label>
          <input type="date" style={s.inp} value={proxima} min={hoy} onChange={e => setProxima(e.target.value)} />

          <button
            style={{ ...s.btnGuardar, opacity: (isPending || !puedeGuardar) ? 0.6 : 1 }}
            disabled={isPending || !puedeGuardar}
            onClick={() => onGuardar({
              maquina_id: maquinaId,
              titulo: titulo.trim(),
              descripcion: descripcion.trim() || undefined,
              categoria,
              frecuencia,
              proxima_fecha: proxima
            })}
          >
            {isPending ? 'Guardando…' : 'Crear plan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Detalle del Plan ────────────────────────────────────
function ModalDetallePlan({ plan, isPending, onClose, onEliminar, onProgramar }: {
  plan: PlanPreventivo
  isPending: boolean
  onClose: () => void
  onEliminar: () => void
  onProgramar: (fecha: string) => void
}) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [fecha, setFecha] = useState(plan.proxima_fecha)
  const dias = diasHasta(plan.proxima_fecha)
  const urgencia = urgenciaBadge(dias)
  const fColor = FRECUENCIA_COLOR[plan.frecuencia]

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={{ ...s.modalHeader, borderBottom: `2px solid ${fColor}44` }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ ...s.planFreqBadge, background: fColor + '18', color: fColor }}>
                <Repeat2 size={11} /> {FRECUENCIA_LABEL[plan.frecuencia]}
              </div>
            </div>
            <div style={s.modalTitle}>{plan.titulo}</div>
            <div style={{ fontSize: 12, color: '#5A7A72', marginTop: 2 }}>
              {plan.maquina?.nombre} · {plan.maquina?.area}
            </div>
          </div>
          <button style={s.modalClose} onClick={onClose}><X size={20} /></button>
        </div>

        <div style={s.modalBody}>
          {plan.descripcion && (
            <div style={s.descBox}>{plan.descripcion}</div>
          )}

          <div style={s.detRow}>
            <span style={s.detLabel}>Próxima fecha</span>
            <span style={{ ...s.urgBadge, background: urgencia.bg, color: urgencia.color }}>
              {plan.proxima_fecha} — {urgencia.label}
            </span>
          </div>
          <div style={s.detRow}>
            <span style={s.detLabel}>Creado por</span>
            <span>{plan.creador?.nombre ?? '—'}</span>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #E2EFEB', margin: '8px 0' }} />

          <label style={s.label}>Programar nueva ejecución</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="date" style={{ ...s.inp, flex: 1, marginBottom: 0 }}
              value={fecha} min={hoy}
              onChange={e => setFecha(e.target.value)}
            />
            <button
              style={{ ...s.btnGuardar, marginTop: 0, padding: '10px 16px', flexShrink: 0 }}
              disabled={isPending}
              onClick={() => onProgramar(fecha)}
            >
              <CalendarCheck2 size={15} /> Programar
            </button>
          </div>

          <button
            style={{ ...s.btnEliminar, opacity: isPending ? 0.6 : 1 }}
            disabled={isPending}
            onClick={onEliminar}
          >
            Desactivar plan
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Acción sobre un mantenimiento ─────────────────────
function ModalAccionMantenimiento({ mantenimiento, isPending, onClose, onCompletar, onOmitir }: {
  mantenimiento: MantenimientoPreventivo
  isPending: boolean
  onClose: () => void
  onCompletar: (obs?: string) => void
  onOmitir: (obs?: string) => void
}) {
  const [obs, setObs] = useState('')
  const dias = diasHasta(mantenimiento.fecha_programada)

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={{ ...s.modal, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div>
            <div style={s.modalTitle}>{mantenimiento.plan?.titulo}</div>
            <div style={{ fontSize: 12, color: '#5A7A72', marginTop: 2 }}>
              {mantenimiento.maquina?.nombre} · {mantenimiento.fecha_programada}
              {' · '}<span style={{ color: dias < 0 ? '#E24B4A' : '#5A7A72' }}>
                {dias < 0 ? `Vencido ${Math.abs(dias)}d` : dias === 0 ? 'Hoy' : `Faltan ${dias}d`}
              </span>
            </div>
          </div>
          <button style={s.modalClose} onClick={onClose}><X size={20} /></button>
        </div>

        <div style={s.modalBody}>
          <label style={s.label}>Observaciones (opcional)</label>
          <textarea
            style={{ ...s.inp, resize: 'none' }} rows={3}
            value={obs} onChange={e => setObs(e.target.value)}
            placeholder="Detalles de lo realizado o motivo de omisión…"
          />

          <button
            style={{ ...s.btnGuardar, opacity: isPending ? 0.7 : 1 }}
            disabled={isPending}
            onClick={() => onCompletar(obs.trim() || undefined)}
          >
            <CheckCircle2 size={16} />
            {isPending ? 'Guardando…' : 'Marcar como completado'}
          </button>

          <button
            style={{ ...s.btnSkip, opacity: isPending ? 0.7 : 1 }}
            disabled={isPending}
            onClick={() => onOmitir(obs.trim() || undefined)}
          >
            <SkipForward size={15} /> Omitir esta vez
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Estilos ───────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  container:    { display: 'flex', flexDirection: 'column', gap: 16 },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 },
  headerLeft:   { display: 'flex', alignItems: 'center', gap: 12 },
  headerIcon:   { width: 42, height: 42, borderRadius: 10, background: '#E8F8F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1D9E75', flexShrink: 0 },
  title:        { margin: 0, fontSize: 17, fontWeight: 700, color: '#0F2621' },
  subtitle:     { margin: '2px 0 0', fontSize: 12, color: '#5A7A72' },
  btnCrear:     { display: 'flex', alignItems: 'center', gap: 6, background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },

  toolbar:      { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  selectWrap:   { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #E2EFEB', borderRadius: 10, padding: '8px 12px', flex: 1, minWidth: 0 },
  select:       { border: 'none', outline: 'none', fontSize: 13, color: '#0F2621', background: 'transparent', flex: 1, minWidth: 0, width: 0 },
  vistaTabs:    { display: 'flex', background: '#fff', border: '1px solid #E2EFEB', borderRadius: 10, overflow: 'hidden', flexShrink: 0 },
  vistaBtn:     { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', border: 'none', background: 'transparent', fontSize: 13, color: '#5A7A72', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' },
  vistaBtnActive:{ background: '#1D9E75', color: '#fff', fontWeight: 700 },

  list:         { display: 'flex', flexDirection: 'column', gap: 10 },
  loadingText:  { color: '#8AADA6', textAlign: 'center', padding: '32px 0' },
  empty:        { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '48px 16px', color: '#5A7A72', fontSize: 14 },

  planCard:     { background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #E2EFEB', display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'box-shadow 0.15s' },
  planFreqBadge:{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, flexShrink: 0, marginTop: 2 },
  planBody:     { flex: 1, minWidth: 0 },
  planTitulo:   { fontSize: 14, fontWeight: 700, color: '#0F2621' },
  planMeta:     { fontSize: 11, color: '#5A7A72', marginTop: 3 },
  planDesc:     { fontSize: 12, color: '#2D4A42', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  urgBadge:     { fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20 },
  proximaFecha: { fontSize: 10, color: '#8AADA6', marginTop: 4 },

  mantCard:     { background: '#fff', borderRadius: 12, padding: '12px 16px', border: '1px solid #E2EFEB', borderLeft: '4px solid #E2EFEB', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', width: '100%' },
  mantLeft:     { flexShrink: 0, textAlign: 'center', minWidth: 64 },
  mantFecha:    { fontSize: 12, fontWeight: 700, color: '#0F2621' },
  mantBody:     { flex: 1, minWidth: 0 },
  mantTitulo:   { fontSize: 13, fontWeight: 700, color: '#0F2621' },
  mantMeta:     { fontSize: 11, color: '#5A7A72', marginTop: 2 },
  mantObs:      { fontSize: 11, color: '#8AADA6', fontStyle: 'italic', marginTop: 3 },
  estadoBadge:  { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, flexShrink: 0 },

  overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 },
  modal:        { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '90dvh', overflow: 'auto' },
  modalHeader:  { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid #E2EFEB' },
  modalTitle:   { fontSize: 16, fontWeight: 700, color: '#0F2621', marginTop: 4 },
  modalClose:   { background: 'transparent', border: 'none', cursor: 'pointer', color: '#5A7A72', padding: 4, flexShrink: 0 },
  modalBody:    { padding: 16, display: 'flex', flexDirection: 'column', gap: 10 },

  label:        { fontSize: 12, fontWeight: 600, color: '#2D4A42' },
  inp:          { border: '1px solid #C8DED9', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#0F2621', background: '#fff', width: '100%', boxSizing: 'border-box' as const, marginBottom: 0, fontFamily: 'system-ui, sans-serif' },
  freqRow:      { display: 'flex', gap: 8 },
  freqBtn:      { flex: 1, padding: '10px', border: '1px solid #E2EFEB', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnGuardar:   { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#1D9E75', border: 'none', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', marginTop: 4 },
  btnEliminar:  { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 600, color: '#B91C1C', cursor: 'pointer', marginTop: 4 },
  btnSkip:      { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#F8FAFC', border: '1px solid #E2EFEB', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 600, color: '#5A7A72', cursor: 'pointer' },
  descBox:      { background: '#F0FAF6', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#0F2621', border: '1px solid #C8DED9' },
  detRow:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#0F2621', flexWrap: 'wrap', gap: 6 },
  detLabel:     { color: '#5A7A72', fontSize: 12 },
  catBadge:     { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12 },
}
