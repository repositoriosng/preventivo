import { useState }        from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMaquina, usePlantillaChecklist, useGuardarChecklist } from '@/hooks/useMaquinas'
import { useTurno }         from '@/hooks/useTurno'
import { VALOR_ITEM_COLOR } from '@/lib/constants'
import type { ValorItem }   from '@/types'

type Respuestas = Record<string, ValorItem>

export default function ChecklistPage() {
  const { maquinaId = '' }     = useParams<{ maquinaId: string }>()
  const navigate                = useNavigate()
  const { turnoActivo }         = useTurno()

  const { data: maquina }   = useMaquina(maquinaId)
  const { data: plantilla, isLoading } = usePlantillaChecklist(maquinaId)
  const guardar             = useGuardarChecklist()

  const [respuestas, setRespuestas]       = useState<Respuestas>({})
  const [observaciones, setObservaciones] = useState('')
  const [submitted, setSubmitted]         = useState(false)

  function setValor(itemId: string, valor: ValorItem) {
    setRespuestas(prev => ({ ...prev, [itemId]: valor }))
  }

  const totalItems   = plantilla?.length ?? 0
  const completados  = Object.keys(respuestas).length
  const progreso     = totalItems ? Math.round((completados / totalItems) * 100) : 0
  const hayMalo      = Object.values(respuestas).some(v => v === 'malo')
  const todoCompleto = completados === totalItems && totalItems > 0

  async function handleGuardar() {
    if (!turnoActivo || !plantilla) return

    const items = plantilla.map(item => ({
      plantilla_item_id: item.id,
      valor: respuestas[item.id] ?? 'ok',
    }))

    await guardar.mutateAsync({
      turno_id:      turnoActivo.id,
      maquina_id:    maquinaId,
      observaciones: observaciones || undefined,
      items,
    })

    setSubmitted(true)
    setTimeout(() => navigate('/dashboard'), 1800)
  }

  if (submitted) {
    return (
      <div style={s.page}>
        <div style={s.successBox}>
          <div style={{ fontSize: 48 }}>✅</div>
          <h2 style={{ margin: '12px 0 4px', color: '#0F2621' }}>Checklist guardado</h2>
          <p style={{ color: '#5A7A72', margin: 0 }}>Volviendo al dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      {/* ── Header ── */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate('/dashboard')} aria-label="Volver">‹</button>
        <div>
          <div style={s.headerTitle}>{maquina?.nombre ?? 'Cargando…'}</div>
          <div style={s.headerSub}>{maquina?.codigo} · {maquina?.area}</div>
        </div>
      </div>

      {/* ── Barra de progreso ── */}
      <div style={s.progresoWrap}>
        <div style={s.progresoBar}>
          <div style={{ ...s.progresoFill, width: `${progreso}%` }} />
        </div>
        <span style={s.progresoLabel}>{completados}/{totalItems} ítems</span>
      </div>

      {/* ── Alerta si hay ítems malos ── */}
      {hayMalo && (
        <div style={s.alertaMalo}>
          ⚠️ Hay ítems en estado <strong>Malo</strong>. Considera reportar una anomalía.
        </div>
      )}

      <div style={s.body}>
        {/* ── Ítems del checklist ── */}
        {isLoading && <p style={{ color: '#8AADA6', textAlign: 'center' }}>Cargando ítems…</p>}

        {plantilla?.map(item => {
          const valorActual = respuestas[item.id]
          return (
            <div key={item.id} style={s.itemCard}>
              <div style={s.itemHeader}>
                <span style={s.itemCategoria}>{item.categoria}</span>
                <span style={s.itemNombre}>{item.nombre_item}</span>
              </div>
              <div style={s.pillRow}>
                {(['ok', 'regular', 'malo'] as ValorItem[]).map(v => (
                  <button
                    key={v}
                    style={{
                      ...s.pill,
                      ...(valorActual === v ? {
                        background: VALOR_ITEM_COLOR[v] + '22',
                        borderColor: VALOR_ITEM_COLOR[v],
                        color: VALOR_ITEM_COLOR[v],
                        fontWeight: 700,
                      } : {}),
                    }}
                    onClick={() => setValor(item.id, v)}
                  >
                    {v === 'ok' ? '✓ OK' : v === 'regular' ? '~ Regular' : '✕ Malo'}
                  </button>
                ))}
              </div>
            </div>
          )
        })}

        {/* ── Observaciones ── */}
        <div style={s.obsCard}>
          <label style={s.obsLabel}>Observaciones (opcional)</label>
          <textarea
            style={s.obsTextarea}
            rows={3}
            placeholder="Describe cualquier detalle relevante del turno o la máquina…"
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
          />
        </div>

        {/* ── Botones ── */}
        <div style={s.actions}>
          {hayMalo && (
            <button
              style={s.btnAnomalia}
              onClick={() => navigate('/anomalias')}
            >
              ⚠️ Reportar anomalía
            </button>
          )}
          <button
            style={{
              ...s.btnGuardar,
              opacity: (!todoCompleto || guardar.isPending) ? 0.6 : 1,
              cursor:  (!todoCompleto || guardar.isPending) ? 'not-allowed' : 'pointer',
            }}
            disabled={!todoCompleto || guardar.isPending}
            onClick={handleGuardar}
          >
            {guardar.isPending ? 'Guardando…' : 'Guardar checklist'}
          </button>
          {!todoCompleto && (
            <p style={s.hintCompleta}>Completa todos los ítems para guardar.</p>
          )}
        </div>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100dvh', background: '#F0FAF6', fontFamily: 'system-ui, sans-serif' },
  header: {
    background: '#1D9E75', padding: '14px 16px',
    display: 'flex', alignItems: 'center', gap: 12,
  },
  backBtn: {
    background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
    width: 32, height: 32, borderRadius: 8, fontSize: 20, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontWeight: 700, fontSize: 16 },
  headerSub:   { color: '#9FE1CB', fontSize: 12 },
  progresoWrap: {
    background: '#fff', padding: '10px 16px',
    display: 'flex', alignItems: 'center', gap: 10,
    borderBottom: '1px solid #E2EFEB',
  },
  progresoBar:  { flex: 1, height: 6, background: '#C8DED9', borderRadius: 99 },
  progresoFill: { height: 6, background: '#1D9E75', borderRadius: 99, transition: 'width 0.3s' },
  progresoLabel:{ fontSize: 12, color: '#5A7A72', whiteSpace: 'nowrap' },
  alertaMalo: {
    background: '#FEF9EC', border: '1px solid #F5D78E',
    padding: '10px 16px', fontSize: 13, color: '#633806',
  },
  body: { padding: 16, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 600, margin: '0 auto' },
  itemCard: {
    background: '#fff', borderRadius: 12, padding: '14px 16px',
    border: '1px solid #E2EFEB',
  },
  itemHeader: { display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 12 },
  itemCategoria: {
    fontSize: 10, fontWeight: 700, color: '#1D9E75',
    textTransform: 'uppercase', letterSpacing: '0.08em',
  },
  itemNombre: { fontSize: 14, fontWeight: 600, color: '#0F2621' },
  pillRow: { display: 'flex', gap: 8 },
  pill: {
    flex: 1, padding: '8px 4px', borderRadius: 8,
    border: '1px solid #C8DED9', background: 'transparent',
    fontSize: 12, color: '#5A7A72', cursor: 'pointer',
    transition: 'all 0.12s',
  },
  obsCard: {
    background: '#fff', borderRadius: 12, padding: '14px 16px',
    border: '1px solid #E2EFEB',
  },
  obsLabel: { fontSize: 12, fontWeight: 500, color: '#2D4A42', display: 'block', marginBottom: 8 },
  obsTextarea: {
    width: '100%', border: '1px solid #C8DED9', borderRadius: 8,
    padding: '10px 12px', fontSize: 13, resize: 'none',
    fontFamily: 'system-ui, sans-serif', color: '#0F2621',
    boxSizing: 'border-box',
  },
  actions: { display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 32 },
  btnAnomalia: {
    background: '#FEF9EC', border: '1px solid #F5D78E', borderRadius: 10,
    padding: '12px', fontSize: 14, fontWeight: 600, color: '#633806', cursor: 'pointer',
  },
  btnGuardar: {
    background: '#1D9E75', border: 'none', borderRadius: 10,
    padding: '14px', fontSize: 15, fontWeight: 700, color: '#fff',
    transition: 'opacity 0.15s',
  },
  hintCompleta: { textAlign: 'center', fontSize: 12, color: '#8AADA6', margin: 0 },
  successBox: {
    minHeight: '100dvh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
}
