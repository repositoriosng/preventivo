import { supabase } from './supabase'
import type { PlanPreventivo, MantenimientoPreventivo } from '@/types'

// ── Planes ────────────────────────────────────────────────────

export interface CrearPlanDTO {
  maquina_id:    string
  titulo:        string
  descripcion?:  string
  categoria:     'mecanico' | 'electrico' | 'lubricacion' | 'limpieza' | 'general' | 'otro'
  frecuencia:    'diaria' | 'semanal' | 'mensual'
  proxima_fecha: string   // 'YYYY-MM-DD'
}

export async function getPlanes(maquinaId?: string, categoria?: string): Promise<PlanPreventivo[]> {
  let q = supabase
    .from('planes_preventivos')
    .select(`
      *,
      maquina:maquinas(id, nombre, codigo, area),
      creador:usuarios!planes_preventivos_creado_por_fkey(id, nombre)
    `)
    .eq('activo', true)
    .order('proxima_fecha')

  if (maquinaId) q = q.eq('maquina_id', maquinaId)
  if (categoria) q = q.eq('categoria', categoria)

  const { data, error } = await q
  if (error) throw error
  return data as PlanPreventivo[]
}

export async function crearPlan(creadoPor: string, dto: CrearPlanDTO): Promise<PlanPreventivo> {
  const { data, error } = await supabase
    .from('planes_preventivos')
    .insert({ ...dto, creado_por: creadoPor })
    .select(`
      *,
      maquina:maquinas(id, nombre, codigo, area),
      creador:usuarios!planes_preventivos_creado_por_fkey(id, nombre)
    `)
    .single()
  if (error) throw error
  return data as PlanPreventivo
}

export async function actualizarPlan(id: string, dto: Partial<CrearPlanDTO> & { activo?: boolean }): Promise<void> {
  const { error } = await supabase
    .from('planes_preventivos')
    .update(dto)
    .eq('id', id)
  if (error) throw error
}

export async function eliminarPlan(id: string): Promise<void> {
  const { error } = await supabase
    .from('planes_preventivos')
    .update({ activo: false })
    .eq('id', id)
  if (error) throw error
}

// ── Mantenimientos (ejecuciones) ───────────────────────────────

export interface FiltrosMantenimiento {
  maquinaId?: string
  estados?:   ('programado' | 'completado' | 'omitido')[]
  categoria?: string
  desde?:     string
  hasta?:     string
}

export async function getMantenimientos(filtros: FiltrosMantenimiento = {}): Promise<MantenimientoPreventivo[]> {
  let q = supabase
    .from('mantenimientos_preventivos')
    .select(`
      *,
      plan:planes_preventivos!inner(id, titulo, frecuencia, categoria),
      maquina:maquinas(id, nombre, codigo, area),
      realizadoPor:usuarios!mantenimientos_preventivos_realizado_por_fkey(id, nombre)
    `)
    .order('fecha_programada', { ascending: false }) // changed to descending so history is latest first

  if (filtros.maquinaId) q = q.eq('maquina_id', filtros.maquinaId)
  if (filtros.estados)   q = q.in('estado', filtros.estados)
  if (filtros.categoria) q = q.eq('plan.categoria', filtros.categoria)
  if (filtros.desde)     q = q.gte('fecha_programada', filtros.desde)
  if (filtros.hasta)     q = q.lte('fecha_programada', filtros.hasta)

  const { data, error } = await q
  if (error) throw error
  return data as MantenimientoPreventivo[]
}

export async function programarMantenimiento(
  planId: string, maquinaId: string, fechaProgramada: string
): Promise<MantenimientoPreventivo> {
  const { data, error } = await supabase
    .from('mantenimientos_preventivos')
    .insert({ plan_id: planId, maquina_id: maquinaId, fecha_programada: fechaProgramada })
    .select(`*, plan:planes_preventivos(id, titulo, frecuencia), maquina:maquinas(id, nombre, codigo, area)`)
    .single()
  if (error) throw error
  return data as MantenimientoPreventivo
}

export async function completarMantenimiento(
  id: string, realizadoPor: string, observaciones?: string
): Promise<void> {
  const { error } = await supabase
    .from('mantenimientos_preventivos')
    .update({
      estado:         'completado',
      realizado_por:  realizadoPor,
      realizado_en:   new Date().toISOString(),
      observaciones:  observaciones ?? null,
    })
    .eq('id', id)
  if (error) throw error
}

export async function omitirMantenimiento(id: string, observaciones?: string): Promise<void> {
  const { error } = await supabase
    .from('mantenimientos_preventivos')
    .update({ estado: 'omitido', observaciones: observaciones ?? null })
    .eq('id', id)
  if (error) throw error
}
