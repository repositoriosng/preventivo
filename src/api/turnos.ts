import { supabase } from './supabase'
import type { Turno, AbrirTurnoDTO } from '@/types'

export async function getTurnoActivo(operadorId: string): Promise<Turno | null> {
  const { data, error } = await supabase
    .from('turnos')
    .select('*, operador:usuarios(id, nombre)')
    .eq('operador_id', operadorId)
    .eq('estado', 'abierto')
    .maybeSingle()
  if (error) throw error
  return data as Turno | null
}

export async function abrirTurno(
  operadorId: string,
  dto: AbrirTurnoDTO
): Promise<Turno> {
  const { data, error } = await supabase
    .from('turnos')
    .insert({ operador_id: operadorId, tipo: dto.tipo })
    .select()
    .single()
  if (error) throw error
  return data as Turno
}

export async function cerrarTurno(
  turnoId: string,
  observaciones?: string
): Promise<Turno> {
  const { data, error } = await supabase
    .from('turnos')
    .update({ estado: 'cerrado', fin: new Date().toISOString(), observaciones })
    .eq('id', turnoId)
    .select()
    .single()
  if (error) throw error
  return data as Turno
}

export async function getTurnos(filtros?: {
  operadorId?: string
  tipo?: string
  desde?: string
  hasta?: string
  limit?: number
}): Promise<Turno[]> {
  let query = supabase
    .from('turnos')
    .select('*, operador:usuarios(id, nombre)')
    .order('inicio', { ascending: false })
    .limit(filtros?.limit ?? 50)

  if (filtros?.operadorId) query = query.eq('operador_id', filtros.operadorId)
  if (filtros?.tipo)       query = query.eq('tipo', filtros.tipo)
  if (filtros?.desde)      query = query.gte('inicio', filtros.desde)
  if (filtros?.hasta)      query = query.lte('inicio', filtros.hasta)

  const { data, error } = await query
  if (error) throw error
  return data as Turno[]
}
