import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTodasLasMaquinas } from '@/api/maquinas'
import { getChecklistsMaquina } from '@/api/checklist'
import { formatFecha, formatRelativo } from '@/lib/utils'
import { ESTADO_MAQUINA_COLOR } from '@/lib/constants'
import type { ChecklistRegistro, Maquina } from '@/types'
import { ChevronRight, X, CheckCircle2, AlertTriangle, Clock, User, MessageSquare } from 'lucide-react'

const RESULTADO_COLOR: Record<string, string> = {
  ok:      '#1D9E75',
  revisar: '#EF9F27',
  critico: '#E24B4A',
}
const RESULTADO_LABEL: Record<string, string> = {
  ok:      'Todo OK',
  revisar: 'Requiere revisión',
  critico: 'Crítico',
}
const VALOR_COLOR: Record<string, string> = {
  ok:      '#1D9E75',
  regular: '#EF9F27',
  malo:    '#E24B4A',
}
const VALOR_LABEL: Record<string, string> = {
  ok:      'OK',
  regular: 'Regular',
  malo:    'Malo',
}

export default function HistorialChecklists() {
  const [maquinaSeleccionada, setMaquinaSeleccionada] = useState<Maquina | null>(null)
  const [registroSeleccionado, setRegistroSeleccionado] = useState<ChecklistRegistro | null>(null)

  const { data: maquinas, isLoading } = useQuery({
    queryKey: ['maquinas', 'admin'],
    queryFn:  getTodasLasMaquinas,
  })

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Historial de Checklists</h2>
          <p style={s.subtitle}>Revisa qué marcó cada operador en cada turno, incluyendo sus comentarios</p>
        </div>
      </div>

      {isLoading && (
        <p style={{ color: '#8AADA6', textAlign: 'center', padding: 32 }}>Cargando máquinas…</p>
      )}

      <div style={s.maquinaGrid}>
        {maquinas?.map(m => {
          const color = m.activa ? ESTADO_MAQUINA_COLOR[m.estado_actual] : '#94a3b8'
          return (
            <button
              key={m.id}
              style={{ ...s.maquinaCard, borderLeftColor: color }}
              onClick={() => setMaquinaSeleccionada(m)}
            >
              <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                <div style={s.maquinaNombre}>{m.nombre}</div>
                <div style={s.maquinaMeta}>{m.area} · {m.codigo}</div>
                {m.ultima_revision && (
                  <div style={s.maquinaUltima}>Última revisión: {formatRelativo(m.ultima_revision)}</div>
                )}
              </div>
              <ChevronRight size={16} color="#8AADA6" />
            </button>
          )
        })}
      </div>

      {maquinaSeleccionada && (
        <ModalChecklists
          maquina={maquinaSeleccionada}
          onClose={() => { setMaquinaSeleccionada(null); setRegistroSeleccionado(null) }}
          onVerDetalle={r => setRegistroSeleccionado(r)}
        />
      )}

      {registroSeleccionado && (
        <ModalDetalleChecklist
          registro={registroSeleccionado}
          onClose={() => setRegistroSeleccionado(null)}
        />
      )}
    </div>
  )
}

function ModalChecklists({
  maquina, onClose, onVerDetalle
}: {
  maquina: Maquina
  onClose: () => void
  onVerDetalle: (r: ChecklistRegistro) => void
}) {
  const { data: registros, isLoading } = useQuery({
    queryKey: ['checklists-maquina', maquina.id],
    queryFn: () => getChecklistsMaquina(maquina.id, 30),
  })

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.panel} onClick={e => e.stopPropagation()}>
        <div style={s.panelHeader}>
          <div>
            <div style={s.panelTitle}>{maquina.nombre}</div>
            <div style={s.panelSub}>{maquina.area} · {maquina.codigo} · Últimos 30 registros</div>
          </div>
          <button style={s.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>

        <div style={s.panelBody}>
          {isLoading && (
            <p style={{ color: '#8AADA6', textAlign: 'center', padding: 24 }}>Cargando historial…</p>
          )}

          {!isLoading && (!registros || registros.length === 0) && (
            <div style={s.empty}>
              <CheckCircle2 size={36} color="#C8DED9" />
              <p>Esta máquina aún no tiene checklists registrados.</p>
            </div>
          )}

          {registros?.map(r => (
            <button key={r.id} style={s.registroCard} onClick={() => onVerDetalle(r)}>
              <div style={{
                ...s.resultBadge,
                background: RESULTADO_COLOR[r.resultado_general] + '18',
                color: RESULTADO_COLOR[r.resultado_general]
              }}>
                {r.resultado_general === 'ok'
                  ? <CheckCircle2 size={13} />
                  : r.resultado_general === 'revisar'
                    ? <Clock size={13} />
                    : <AlertTriangle size={13} />
                }
                {RESULTADO_LABEL[r.resultado_general]}
              </div>
              <div style={s.registroInfo}>
                <div style={s.registroFecha}>{formatFecha(r.fecha_hora)}</div>
                <div style={s.registroMeta}>
                  {r.operador?.nombre ?? 'Operador'}
                  {r.observaciones && (
                    <span style={{ marginLeft: 8, color: '#8AADA6', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                      <MessageSquare size={10} /> Con observaciones
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={16} color="#8AADA6" style={{ flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ModalDetalleChecklist({
  registro, onClose
}: {
  registro: ChecklistRegistro
  onClose: () => void
}) {
  // Agrupar ítems por categoría
  const categorias = new Map<string, NonNullable<ChecklistRegistro['items']>>()
  registro.items?.forEach(item => {
    const cat = item.plantilla_item?.categoria ?? 'General'
    if (!categorias.has(cat)) categorias.set(cat, [])
    categorias.get(cat)!.push(item)
  })

  const totalItems = registro.items?.length ?? 0
  const okCount    = registro.items?.filter(i => i.valor === 'ok').length ?? 0
  const regCount   = registro.items?.filter(i => i.valor === 'regular').length ?? 0
  const maloCount  = registro.items?.filter(i => i.valor === 'malo').length ?? 0

  const rColor = RESULTADO_COLOR[registro.resultado_general]

  return (
    <div style={{ ...s.overlay, zIndex: 110 }} onClick={onClose}>
      <div style={{ ...s.panel, maxWidth: 500, boxShadow: '-8px 0 32px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>

        <div style={{ ...s.panelHeader, borderBottom: `2px solid ${rColor}44` }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ ...s.resultBadge, background: rColor + '18', color: rColor }}>
                {registro.resultado_general === 'ok'
                  ? <CheckCircle2 size={13} />
                  : registro.resultado_general === 'revisar'
                    ? <Clock size={13} />
                    : <AlertTriangle size={13} />
                }
                {RESULTADO_LABEL[registro.resultado_general]}
              </div>
            </div>
            <div style={{ ...s.panelSub, marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
              <User size={11} />
              {registro.operador?.nombre ?? 'Operador'} · {formatFecha(registro.fecha_hora)}
            </div>
          </div>
          <button style={s.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>

        <div style={s.panelBody}>
          {/* Chips resumen */}
          <div style={s.summaryRow}>
            <div style={{ ...s.summaryChip, background: '#E8F8F2', color: '#1D9E75' }}>
              <CheckCircle2 size={12} /> {okCount} OK
            </div>
            {regCount > 0 && (
              <div style={{ ...s.summaryChip, background: '#FFF7E6', color: '#EF9F27' }}>
                <Clock size={12} /> {regCount} Regular
              </div>
            )}
            {maloCount > 0 && (
              <div style={{ ...s.summaryChip, background: '#FEF2F2', color: '#E24B4A' }}>
                <AlertTriangle size={12} /> {maloCount} Malo
              </div>
            )}
            <div style={{ ...s.summaryChip, background: '#F0F4FF', color: '#6366F1' }}>
              {totalItems} ítems totales
            </div>
          </div>

          {/* Ítems por categoría */}
          {[...categorias.entries()].map(([cat, items]) => (
            <div key={cat}>
              <div style={s.catLabel}>{cat}</div>
              {items.map(item => (
                <div key={item.id} style={{
                  ...s.itemRow,
                  background: item.valor !== 'ok' ? VALOR_COLOR[item.valor] + '08' : 'transparent',
                  borderRadius: item.valor !== 'ok' ? 6 : 0,
                  padding: item.valor !== 'ok' ? '7px 10px' : '7px 0',
                }}>
                  <div style={s.itemNombre}>{item.plantilla_item?.nombre_item ?? 'Ítem'}</div>
                  <span style={{
                    ...s.valorBadge,
                    background: VALOR_COLOR[item.valor] + '18',
                    color: VALOR_COLOR[item.valor],
                  }}>
                    {VALOR_LABEL[item.valor]}
                  </span>
                </div>
              ))}
            </div>
          ))}

          {/* Observaciones */}
          {registro.observaciones && (
            <div style={s.obsBox}>
              <div style={s.obsTitle}>
                <MessageSquare size={13} style={{ marginRight: 6 }} />
                Comentario del operador
              </div>
              <p style={s.obsText}>"{registro.observaciones}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  container:   { display: 'flex', flexDirection: 'column', gap: 16 },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  title:       { margin: 0, fontSize: 17, fontWeight: 700, color: '#0F2621' },
  subtitle:    { margin: '2px 0 0', fontSize: 12, color: '#5A7A72' },

  maquinaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 },
  maquinaCard: {
    background: '#fff', borderRadius: 10, padding: '12px 14px',
    border: '1px solid #E2EFEB', borderLeft: '4px solid #1D9E75',
    display: 'flex', alignItems: 'center', gap: 10,
    cursor: 'pointer', textAlign: 'left', width: '100%',
  },
  maquinaNombre: { fontSize: 13, fontWeight: 700, color: '#0F2621', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  maquinaMeta:   { fontSize: 11, color: '#5A7A72', marginTop: 2 },
  maquinaUltima: { fontSize: 10, color: '#1D9E75', marginTop: 3 },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', zIndex: 100 },
  panel:   { background: '#fff', width: '100%', maxWidth: 440, height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)' },

  panelHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid #E2EFEB', background: '#F8FAFB', flexShrink: 0 },
  panelTitle:  { fontSize: 15, fontWeight: 700, color: '#0F2621' },
  panelSub:    { fontSize: 11, color: '#5A7A72', marginTop: 4 },
  closeBtn:    { background: 'transparent', border: 'none', cursor: 'pointer', color: '#5A7A72', padding: 4, flexShrink: 0 },
  panelBody:   { flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 },

  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '40px 16px', color: '#8AADA6', fontSize: 13 },

  registroCard: {
    background: '#fff', borderRadius: 10, padding: '10px 14px',
    border: '1px solid #E2EFEB', display: 'flex', alignItems: 'center',
    gap: 12, cursor: 'pointer', width: '100%', textAlign: 'left',
  },
  resultBadge:  { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, flexShrink: 0 },
  registroInfo: { flex: 1, minWidth: 0 },
  registroFecha:{ fontSize: 13, fontWeight: 600, color: '#0F2621' },
  registroMeta: { fontSize: 11, color: '#5A7A72', marginTop: 2, display: 'flex', alignItems: 'center' },

  summaryRow:  { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 },
  summaryChip: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20 },

  catLabel:   { fontSize: 10, fontWeight: 700, color: '#1D9E75', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginTop: 14, marginBottom: 4 },
  itemRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #F0FAF6' },
  itemNombre: { fontSize: 13, color: '#0F2621' },
  valorBadge: { fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99, flexShrink: 0 },

  obsBox:   { background: '#F8FAFC', border: '1px solid #E2EFEB', borderRadius: 10, padding: '12px 14px', marginTop: 8 },
  obsTitle: { display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 700, color: '#2D4A42', marginBottom: 6 },
  obsText:  { fontSize: 13, color: '#475569', fontStyle: 'italic', margin: 0, lineHeight: 1.5 },
}
