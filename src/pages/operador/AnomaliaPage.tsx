import { useState }      from 'react'
import { useNavigate }   from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMaquinas }   from '@/hooks/useMaquinas'
import { useTurno }      from '@/hooks/useTurno'
import { useAuth }       from '@/hooks/useAuth'
import { useUIStore }    from '@/store'
import { reportarAnomalia, getAnomalias } from '@/api/anomalias'
import { SEVERIDAD_COLOR, SEVERIDAD_LABEL, ESTADO_ANOM_LABEL, CATEGORIA_LABEL } from '@/lib/constants'
import { formatRelativo } from '@/lib/utils'
import type { SeveridadAnom, CategoriaMantenimiento } from '@/types'

export default function AnomaliaPage() {
  const navigate             = useNavigate()
  const { usuario }          = useAuth()
  const { turnoActivo }      = useTurno()
  const { data: maquinas }   = useMaquinas()
  const addToast             = useUIStore(s => s.addToast)
  const qc                   = useQueryClient()

  // Form state
  const [maquinaId,   setMaquinaId]   = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [severidad,   setSeveridad]   = useState<SeveridadAnom>('media')
  const [categoria,   setCategoria]   = useState<CategoriaMantenimiento>('general')

  // Anomalías activas (para que el operador vea el contexto de lo que está sucediendo)
  const { data: anomalias } = useQuery({
    queryKey: ['anomalias', 'activas'],
    queryFn:  () => getAnomalias({ estado: ['abierta', 'en_revision'], limit: 30 }),
  })

  const reportar = useMutation({
    mutationFn: () => {
      if (!usuario || !turnoActivo) throw new Error('Sin turno activo')
      return reportarAnomalia(usuario.id, {
        turno_id:    turnoActivo.id,
        maquina_id:  maquinaId,
        descripcion,
        severidad,
        categoria,
      })
    },
    onSuccess: () => {
      addToast({ type: 'success', message: 'Anomalía reportada — notificado al supervisor' })
      qc.invalidateQueries({ queryKey: ['anomalias'] })
      setTimeout(() => navigate('/dashboard'), 1500)
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Error al reportar anomalía'
      addToast({ type: 'error', message: msg })
    },
  })

  const puedeGuardar = maquinaId && descripcion.trim().length >= 10 && !!turnoActivo

  return (
    <div style={s.page}>
      {/* ── Header ── */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate('/dashboard')} aria-label="Volver">‹</button>
        <div>
          <div style={s.headerTitle}>Reportar anomalía</div>
          <div style={s.headerSub}>Documenta la falla para que mantenimiento la atienda</div>
        </div>
      </div>

      <div style={s.body}>
        {/* ── Formulario ── */}
        {!turnoActivo && (
          <div style={s.alerta}>
            ⚠️ Necesitas un turno activo para reportar anomalías.
          </div>
        )}

        <div style={s.card}>
          {/* Máquina */}
          <div style={s.field}>
            <label style={s.label}>Máquina</label>
            <select
              style={s.select}
              value={maquinaId}
              onChange={e => setMaquinaId(e.target.value)}
              disabled={!turnoActivo}
            >
              <option value="">Selecciona una máquina…</option>
              {maquinas?.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nombre} ({m.codigo})
                </option>
              ))}
            </select>
          </div>

          {/* Categoría */}
          <div style={s.field}>
            <label style={s.label}>Categoría</label>
            <select
              style={s.select}
              value={categoria}
              onChange={e => setCategoria(e.target.value as CategoriaMantenimiento)}
              disabled={!turnoActivo}
            >
              {Object.entries(CATEGORIA_LABEL).map(([val, lbl]) => (
                <option key={val} value={val}>{lbl}</option>
              ))}
            </select>
          </div>

          {/* Severidad */}
          <div style={s.field}>
            <label style={s.label}>Severidad</label>
            <div style={s.sevRow}>
              {(['baja', 'media', 'alta'] as SeveridadAnom[]).map(v => (
                <button
                  key={v}
                  disabled={!turnoActivo}
                  style={{
                    ...s.sevBtn,
                    ...(severidad === v ? {
                      background:   SEVERIDAD_COLOR[v] + '22',
                      borderColor:  SEVERIDAD_COLOR[v],
                      color:        SEVERIDAD_COLOR[v],
                      fontWeight:   700,
                    } : {}),
                  }}
                  onClick={() => setSeveridad(v)}
                >
                  {SEVERIDAD_LABEL[v]}
                </button>
              ))}
            </div>
            <p style={s.sevHint}>
              {severidad === 'baja'  && 'Puede esperar al próximo turno de mantenimiento.'}
              {severidad === 'media' && 'Debe atenderse dentro de este turno.'}
              {severidad === 'alta'  && '🔴 El supervisor será notificado inmediatamente. Considera detener la máquina.'}
            </p>
          </div>

          {/* Descripción */}
          <div style={s.field}>
            <label style={s.label}>Descripción de la anomalía</label>
            <textarea
              style={{ ...s.textarea, borderColor: descripcion.length > 0 && descripcion.length < 10 ? '#EF9F27' : '#C8DED9' }}
              rows={4}
              disabled={!turnoActivo}
              placeholder="Describe con detalle qué observaste: síntomas, condiciones, momento en que ocurrió…"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
            />
            {descripcion.length > 0 && descripcion.length < 10 && (
              <span style={{ fontSize: 11, color: '#EF9F27' }}>
                Mínimo 10 caracteres ({10 - descripcion.length} restantes)
              </span>
            )}
          </div>

          <button
            style={{
              ...s.btnReportar,
              opacity: (!puedeGuardar || reportar.isPending) ? 0.6 : 1,
              cursor:  (!puedeGuardar || reportar.isPending) ? 'not-allowed' : 'pointer',
            }}
            disabled={!puedeGuardar || reportar.isPending}
            onClick={() => reportar.mutate()}
          >
            {reportar.isPending ? 'Enviando…' : 'Reportar anomalía'}
          </button>
        </div>

        {/* ── Lista de anomalías activas ── */}
        {(anomalias?.length ?? 0) > 0 && (
          <>
            <h3 style={s.sectionTitle}>Anomalías activas</h3>
            {anomalias?.map(a => {
              const color = SEVERIDAD_COLOR[a.severidad]
              return (
                <div key={a.id} style={s.anomCard}>
                  <div style={{ ...s.anomDot, background: color }} />
                  <div style={s.anomInfo}>
                    <div style={s.anomMaquina}>{a.maquina?.nombre ?? '—'}</div>
                    <div style={s.anomDesc}>{a.descripcion}</div>
                    <div style={s.anomMeta}>
                      {SEVERIDAD_LABEL[a.severidad]} · {formatRelativo(a.creado_en)}
                    </div>
                  </div>
                  <span style={{ ...s.estadoBadge, background: color + '22', color }}>
                    {ESTADO_ANOM_LABEL[a.estado]}
                  </span>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page:    { minHeight: '100dvh', background: '#F0FAF6', fontFamily: 'system-ui, sans-serif' },
  header:  { background: '#1D9E75', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 },
  backBtn: {
    background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
    width: 32, height: 32, borderRadius: 8, fontSize: 20, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontWeight: 700, fontSize: 16 },
  headerSub:   { color: '#9FE1CB', fontSize: 12 },
  body:    { padding: 16, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 600, margin: '0 auto' },
  alerta:  {
    background: '#FEF9EC', border: '1px solid #F5D78E', borderRadius: 10,
    padding: '12px 14px', fontSize: 13, color: '#633806',
  },
  card:    { background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #E2EFEB', display: 'flex', flexDirection: 'column', gap: 16 },
  field:   { display: 'flex', flexDirection: 'column', gap: 6 },
  label:   { fontSize: 12, fontWeight: 600, color: '#2D4A42' },
  select:  {
    border: '1px solid #C8DED9', borderRadius: 8, padding: '10px 12px',
    fontSize: 13, color: '#0F2621', background: '#fff',
  },
  sevRow:  { display: 'flex', gap: 8 },
  sevBtn:  {
    flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #C8DED9',
    background: 'transparent', fontSize: 13, color: '#5A7A72', cursor: 'pointer', transition: 'all 0.12s',
  },
  sevHint: { fontSize: 12, color: '#5A7A72', margin: 0, minHeight: 18 },
  textarea: {
    width: '100%', border: '1px solid #C8DED9', borderRadius: 8, padding: '10px 12px',
    fontSize: 13, resize: 'none', fontFamily: 'system-ui, sans-serif',
    color: '#0F2621', boxSizing: 'border-box', transition: 'border-color 0.15s',
  },
  btnReportar: {
    background: '#E24B4A', border: 'none', borderRadius: 10,
    padding: '13px', fontSize: 15, fontWeight: 700, color: '#fff', transition: 'opacity 0.15s',
  },
  sectionTitle: { fontSize: 15, fontWeight: 600, color: '#0F2621', margin: '4px 0 0' },
  anomCard: {
    background: '#fff', borderRadius: 12, padding: '12px 14px',
    display: 'flex', alignItems: 'flex-start', gap: 10, border: '1px solid #E2EFEB',
  },
  anomDot:    { width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4 },
  anomInfo:   { flex: 1, minWidth: 0 },
  anomMaquina:{ fontSize: 13, fontWeight: 700, color: '#0F2621' },
  anomDesc:   { fontSize: 12, color: '#2D4A42', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  anomMeta:   { fontSize: 11, color: '#8AADA6', marginTop: 3 },
  estadoBadge:{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, whiteSpace: 'nowrap' },
}
