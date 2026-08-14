import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getReporteMaquinas } from '@/api/reportes'
import { formatRelativo } from '@/lib/utils'
import { BarChart2, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react'

type Rango = '7d' | '30d' | '90d' | 'todo'

const RANGO_LABEL: Record<Rango, string> = {
  '7d':   'Últimos 7 días',
  '30d':  'Último mes',
  '90d':  'Último trimestre',
  'todo': 'Todo el historial',
}

function getRangoDesde(rango: Rango): string | undefined {
  if (rango === 'todo') return undefined
  const days = rango === '7d' ? 7 : rango === '30d' ? 30 : 90
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

export default function ReporteMaquinas() {
  const [rango, setRango] = useState<Rango>('30d')

  const { data, isLoading } = useQuery({
    queryKey: ['reporte-maquinas', rango],
    queryFn:  () => getReporteMaquinas(getRangoDesde(rango)),
  })

  const maxTotal = data?.[0]?.total ?? 1

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.headerRow}>
        <div style={s.headerLeft}>
          <div style={s.headerIcon}><BarChart2 size={22} /></div>
          <div>
            <h2 style={s.title}>Máquinas con más anomalías</h2>
            <p style={s.subtitle}>Ranking por número de fallas reportadas en el período</p>
          </div>
        </div>
        <div style={s.rangoRow}>
          {(Object.keys(RANGO_LABEL) as Rango[]).map(r => (
            <button
              key={r}
              style={{ ...s.rangoBtn, ...(rango === r ? s.rangoBtnActive : {}) }}
              onClick={() => setRango(r)}
            >
              {RANGO_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <p style={{ color: '#8AADA6', textAlign: 'center', padding: 32 }}>Cargando reporte…</p>
      )}

      {!isLoading && (!data || data.length === 0) && (
        <div style={s.empty}>
          <CheckCircle size={40} color="#1D9E75" />
          <p>No hay anomalías registradas en este período.</p>
        </div>
      )}

      {data && data.length > 0 && (
        <>
          {/* Summary cards */}
          <div style={s.summaryRow}>
            <SummaryCard
              icon={<AlertTriangle size={18} />}
              label="Total anomalías"
              value={data.reduce((s, m) => s + m.total, 0)}
              color="#E24B4A"
            />
            <SummaryCard
              icon={<Clock size={18} />}
              label="Pendientes"
              value={data.reduce((s, m) => s + m.abiertas + m.en_revision, 0)}
              color="#EF9F27"
            />
            <SummaryCard
              icon={<CheckCircle size={18} />}
              label="Resueltas"
              value={data.reduce((s, m) => s + m.resueltas, 0)}
              color="#1D9E75"
            />
            <SummaryCard
              icon={<TrendingUp size={18} />}
              label="Máquinas afectadas"
              value={data.length}
              color="#6366F1"
            />
          </div>

          {/* Ranking list */}
          <div style={s.rankList}>
            {data.map((m, idx) => {
              const pendientes = m.abiertas + m.en_revision
              const pctTotal = Math.round((m.total / maxTotal) * 100)
              const pctResueltas = m.total > 0 ? Math.round((m.resueltas / m.total) * 100) : 0

              return (
                <div key={m.maquina_id} style={s.rankCard}>
                  {/* Rank badge */}
                  <div style={{
                    ...s.rankBadge,
                    background: idx === 0 ? '#E24B4A' : idx === 1 ? '#EF9F27' : idx === 2 ? '#3B82F6' : '#94a3b8'
                  }}>
                    #{idx + 1}
                  </div>

                  <div style={s.rankMain}>
                    {/* Machine name & meta */}
                    <div style={s.rankTop}>
                      <div>
                        <div style={s.rankNombre}>{m.nombre}</div>
                        <div style={s.rankMeta}>{m.area} · {m.codigo}</div>
                      </div>
                      <div style={s.rankStats}>
                        {pendientes > 0 && (
                          <span style={{ ...s.pill, background: '#FEF2F2', color: '#B91C1C' }}>
                            {pendientes} pendiente{pendientes !== 1 ? 's' : ''}
                          </span>
                        )}
                        {m.alta > 0 && (
                          <span style={{ ...s.pill, background: '#FEF2F2', color: '#B91C1C', fontWeight: 700 }}>
                            ⬆ {m.alta} alta
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bar */}
                    <div style={s.barTrack}>
                      <div style={{ ...s.barFill, width: `${pctTotal}%`, background: idx === 0 ? '#E24B4A' : idx === 1 ? '#EF9F27' : '#1D9E75' }} />
                    </div>

                    {/* Severity breakdown */}
                    <div style={s.rankBreakdown}>
                      <span style={s.bkItem}>
                        <span style={{ ...s.dot, background: '#E24B4A' }} />
                        Alta: {m.alta}
                      </span>
                      <span style={s.bkItem}>
                        <span style={{ ...s.dot, background: '#EF9F27' }} />
                        Media: {m.media}
                      </span>
                      <span style={s.bkItem}>
                        <span style={{ ...s.dot, background: '#3B82F6' }} />
                        Baja: {m.baja}
                      </span>
                      <span style={s.bkItem}>
                        <span style={{ ...s.dot, background: '#1D9E75' }} />
                        Resueltas: {m.resueltas} ({pctResueltas}%)
                      </span>
                      {m.ultima_anomalia && (
                        <span style={{ ...s.bkItem, color: '#94a3b8', marginLeft: 'auto' }}>
                          Última: {formatRelativo(m.ultima_anomalia)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Total count */}
                  <div style={s.rankTotal}>
                    <div style={s.rankTotalNum}>{m.total}</div>
                    <div style={s.rankTotalLabel}>fallas</div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function SummaryCard({
  icon, label, value, color
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
}) {
  return (
    <div style={s.summaryCard}>
      <div style={{ ...s.summaryIcon, background: color + '18', color }}>{icon}</div>
      <div style={s.summaryNum}>{value}</div>
      <div style={s.summaryLabel}>{label}</div>
    </div>
  )
}

// ── Estilos ──────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 16 },

  headerRow:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  headerIcon: { width: 42, height: 42, borderRadius: 10, background: '#E8F8F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1D9E75', flexShrink: 0 },
  title:      { margin: 0, fontSize: 17, fontWeight: 700, color: '#0F2621' },
  subtitle:   { margin: 0, fontSize: 12, color: '#5A7A72', marginTop: 2 },

  rangoRow:      { display: 'flex', gap: 6, flexWrap: 'wrap' },
  rangoBtn:      { background: '#fff', border: '1px solid #E2EFEB', borderRadius: 20, padding: '6px 12px', fontSize: 12, color: '#5A7A72', cursor: 'pointer', fontWeight: 500 },
  rangoBtnActive:{ background: '#1D9E75', color: '#fff', borderColor: '#1D9E75', fontWeight: 700 },

  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '48px 16px', color: '#5A7A72', fontSize: 14 },

  summaryRow:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 },
  summaryCard: { background: '#fff', borderRadius: 12, padding: '14px 12px', border: '1px solid #E2EFEB', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
  summaryIcon: { width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  summaryNum:  { fontSize: 24, fontWeight: 800, color: '#0F2621' },
  summaryLabel:{ fontSize: 11, color: '#5A7A72', textAlign: 'center' },

  rankList: { display: 'flex', flexDirection: 'column', gap: 10 },
  rankCard: { background: '#fff', borderRadius: 14, padding: '14px 16px', border: '1px solid #E2EFEB', display: 'flex', alignItems: 'flex-start', gap: 14 },
  rankBadge:{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800, flexShrink: 0, marginTop: 2 },
  rankMain: { flex: 1, minWidth: 0 },
  rankTop:  { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, gap: 8 },
  rankNombre:{ fontSize: 14, fontWeight: 700, color: '#0F2621' },
  rankMeta: { fontSize: 11, color: '#5A7A72', marginTop: 2 },
  rankStats:{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' },
  pill:     { fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 99 },

  barTrack: { height: 6, background: '#F0FAF6', borderRadius: 99, overflow: 'hidden', marginBottom: 8 },
  barFill:  { height: '100%', borderRadius: 99, transition: 'width 0.5s ease' },

  rankBreakdown:{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' },
  bkItem:   { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#5A7A72' },
  dot:      { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },

  rankTotal:     { textAlign: 'center', flexShrink: 0 },
  rankTotalNum:  { fontSize: 26, fontWeight: 800, color: '#0F2621', lineHeight: 1 },
  rankTotalLabel:{ fontSize: 10, color: '#8AADA6', fontWeight: 500 },
}
