import { supabase } from './supabase'

export interface ReporteMaquina {
  maquina_id:    string
  nombre:        string
  codigo:        string
  area:          string
  total:         number
  abiertas:      number
  en_revision:   number
  resueltas:     number
  alta:          number
  media:         number
  baja:          number
  ultima_anomalia: string | null
}

export async function getReporteMaquinas(
  desde?: string,  // ISO date string
  hasta?: string
): Promise<ReporteMaquina[]> {
  let query = supabase
    .from('anomalias')
    .select('maquina_id, estado, severidad, creado_en, maquina:maquinas(id, nombre, codigo, area)')

  if (desde) query = query.gte('creado_en', desde)
  if (hasta) query = query.lte('creado_en', hasta)

  const { data, error } = await query
  if (error) throw error

  // Agrupar por máquina
  const map = new Map<string, ReporteMaquina>()

  for (const row of data ?? []) {
    const m = row.maquina as any
    if (!m) continue
    const id = m.id as string

    if (!map.has(id)) {
      map.set(id, {
        maquina_id:      id,
        nombre:          m.nombre,
        codigo:          m.codigo,
        area:            m.area,
        total:           0,
        abiertas:        0,
        en_revision:     0,
        resueltas:       0,
        alta:            0,
        media:           0,
        baja:            0,
        ultima_anomalia: null,
      })
    }

    const entry = map.get(id)!
    entry.total++
    if (row.estado === 'abierta')      entry.abiertas++
    if (row.estado === 'en_revision')  entry.en_revision++
    if (row.estado === 'resuelta' || row.estado === 'descartada') entry.resueltas++
    if (row.severidad === 'alta')  entry.alta++
    if (row.severidad === 'media') entry.media++
    if (row.severidad === 'baja')  entry.baja++

    if (!entry.ultima_anomalia || row.creado_en > entry.ultima_anomalia) {
      entry.ultima_anomalia = row.creado_en
    }
  }

  return [...map.values()].sort((a, b) => b.total - a.total)
}
