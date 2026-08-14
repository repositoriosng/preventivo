import { supabase } from './supabase'
import type {
  Anomalia,
  ReportarAnomaliaDTO,
  ActualizarAnomaliaDTO,
  EstadoAnom,
} from '@/types'

export async function reportarAnomalia(
  operadorId: string,
  dto: ReportarAnomaliaDTO
): Promise<Anomalia> {
  const { data, error } = await supabase
    .from('anomalias')
    .insert({
      turno_id:      dto.turno_id,
      maquina_id:    dto.maquina_id,
      reportado_por: operadorId,
      descripcion:   dto.descripcion,
      severidad:     dto.severidad,
      categoria:     dto.categoria,
      foto_url:      dto.foto_url || null,
    })
    .select()
    .single()
  if (error) throw error

  // Registrar en historial
  await registrarCambioEstado(data.id, operadorId, null, 'abierta')

  return data as Anomalia
}

export async function getAnomalias(filtros?: {
  estado?:    EstadoAnom | EstadoAnom[]
  maquinaId?: string
  turnoId?:   string
  asignadoA?: string
  limit?:     number
}): Promise<Anomalia[]> {
  let query = supabase
    .from('anomalias')
    .select(`
      *,
      maquina:maquinas(id, nombre, codigo),
      reportado_por_usuario:usuarios!anomalias_reportado_por_fkey(id, nombre),
      asignado_a_usuario:usuarios!anomalias_asignado_a_fkey(id, nombre),
      historial:historial_estados(*, usuario:usuarios(id, nombre))
    `)
    .order('creado_en', { ascending: false })
    .limit(filtros?.limit ?? 50)

  if (filtros?.estado) {
    if (Array.isArray(filtros.estado)) {
      query = query.in('estado', filtros.estado)
    } else {
      query = query.eq('estado', filtros.estado)
    }
  }
  if (filtros?.maquinaId) query = query.eq('maquina_id', filtros.maquinaId)
  if (filtros?.turnoId)   query = query.eq('turno_id', filtros.turnoId)
  if (filtros?.asignadoA) query = query.eq('asignado_a', filtros.asignadoA)

  const { data, error } = await query
  if (error) throw error
  return data as Anomalia[]
}

export async function getAnomalia(id: string): Promise<Anomalia> {
  const { data, error } = await supabase
    .from('anomalias')
    .select(`
      *,
      maquina:maquinas(id, nombre, codigo),
      reportado_por_usuario:usuarios!anomalias_reportado_por_fkey(id, nombre),
      asignado_a_usuario:usuarios!anomalias_asignado_a_fkey(id, nombre),
      historial:historial_estados(*, usuario:usuarios(id, nombre))
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Anomalia
}

export async function actualizarAnomalia(
  id: string,
  usuarioId: string,
  dto: ActualizarAnomaliaDTO
): Promise<Anomalia> {
  // Obtener estado anterior para historial
  const { data: anterior } = await supabase
    .from('anomalias')
    .select('estado')
    .eq('id', id)
    .single()

  const updates: Record<string, unknown> = {
    estado:     dto.estado,
    // Permitir desasignar (null) o asignar (uuid)
    asignado_a: dto.asignado_a || null,
  }

  // Marcar fecha de resolución si corresponde
  if (dto.estado === 'resuelta' || dto.estado === 'descartada') {
    updates.resuelto_en = new Date().toISOString()
  } else {
    // Si se reabre, limpiar la fecha de resolución
    updates.resuelto_en = null
  }

  const { error: updateError } = await supabase
    .from('anomalias')
    .update(updates)
    .eq('id', id)
  if (updateError) throw updateError

  // Registrar cambio en historial (no bloquea si falla)
  try {
    await registrarCambioEstado(
      id,
      usuarioId,
      anterior?.estado ?? null,
      dto.estado,
      dto.comentario
    )
  } catch (e) {
    console.warn('No se pudo registrar el historial de estado:', e)
  }

  // Retornar la anomalía actualizada con todas sus relaciones
  return getAnomalia(id)
}

async function registrarCambioEstado(
  anomaliaId: string,
  usuarioId:  string,
  anterior:   EstadoAnom | null,
  nuevo:      EstadoAnom,
  comentario?: string
) {
  await supabase.from('historial_estados').insert({
    anomalia_id:     anomaliaId,
    usuario_id:      usuarioId,
    estado_anterior: anterior,
    estado_nuevo:    nuevo,
    comentario,
  })
}

// Counts para el dashboard
export async function getStatsAnomalias(): Promise<{
  abiertas: number
  enRevision: number
  alta: number
}> {
  const { data, error } = await supabase
    .from('anomalias')
    .select('estado, severidad')
    .in('estado', ['abierta', 'en_revision'])

  if (error) throw error

  return {
    abiertas:   data.filter(a => a.estado === 'abierta').length,
    enRevision: data.filter(a => a.estado === 'en_revision').length,
    alta:       data.filter(a => a.severidad === 'alta').length,
  }
}

// Suscripción real-time: alertas de anomalías alta severidad
export function suscribirseAnomalias(
  callback: (anomalia: Anomalia) => void
) {
  return supabase
    .channel('anomalias-nuevas')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'anomalias' },
      (payload) => callback(payload.new as Anomalia)
    )
    .subscribe()
}
