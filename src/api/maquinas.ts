import { supabase } from './supabase'
import type { Maquina, EstadoMaquina, ChecklistPlantilla, CrearMaquinaDTO, ActualizarMaquinaDTO, CrearItemPlantillaDTO, ActualizarItemPlantillaDTO } from '@/types'

export async function getTodasLasMaquinas(): Promise<Maquina[]> {
  const { data, error } = await supabase
    .from('maquinas')
    .select('*')
    .order('activa', { ascending: false })
    .order('area')
    .order('nombre')
  if (error) throw error
  return data as Maquina[]
}

export async function getMaquinas(): Promise<Maquina[]> {
  const { data, error } = await supabase
    .from('maquinas')
    .select('*')
    .eq('activa', true)
    .order('area')
    .order('nombre')
  if (error) throw error
  return data as Maquina[]
}

export async function getMaquina(id: string): Promise<Maquina> {
  const { data, error } = await supabase
    .from('maquinas')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Maquina
}

export async function actualizarEstadoMaquina(
  id: string,
  estado: EstadoMaquina
): Promise<Maquina> {
  const { data, error } = await supabase
    .from('maquinas')
    .update({ estado_actual: estado, ultima_revision: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Maquina
}

export async function crearMaquina(dto: CrearMaquinaDTO): Promise<Maquina> {
  const { data, error } = await supabase
    .from('maquinas')
    .insert([{
      nombre: dto.nombre,
      codigo: dto.codigo,
      area: dto.area,
      descripcion: dto.descripcion,
      estado_actual: 'ok',
      activa: true
    }])
    .select()
    .single()
  
  if (error) throw error
  return data as Maquina
}

export async function actualizarMaquina(id: string, dto: ActualizarMaquinaDTO): Promise<Maquina> {
  const { data, error } = await supabase
    .from('maquinas')
    .update(dto)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data as Maquina
}

export async function eliminarMaquina(id: string): Promise<void> {
  const { error } = await supabase
    .from('maquinas')
    .delete()
    .eq('id', id)
  
  if (error) {
    if (error.code === '23503') {
      throw new Error('No se puede eliminar la máquina porque tiene historial de mantenimientos o anomalías. Se recomienda "Dar de baja".')
    }
    throw error
  }
}

// Plantilla de checklist de una máquina (ítems activos, ordenados)
export async function getPlantillaChecklist(
  maquinaId: string
): Promise<ChecklistPlantilla[]> {
  const { data, error } = await supabase
    .from('checklist_plantilla')
    .select('*')
    .eq('maquina_id', maquinaId)
    .eq('activo', true)
    .order('orden')
  if (error) throw error
  return data as ChecklistPlantilla[]
}

// Para administración: trae todos (activos e inactivos)
export async function getTodaPlantillaChecklist(
  maquinaId: string
): Promise<ChecklistPlantilla[]> {
  const { data, error } = await supabase
    .from('checklist_plantilla')
    .select('*')
    .eq('maquina_id', maquinaId)
    .order('categoria')
    .order('orden')
  if (error) throw error
  return data as ChecklistPlantilla[]
}

export async function crearItemPlantilla(dto: CrearItemPlantillaDTO): Promise<ChecklistPlantilla> {
  const { data, error } = await supabase
    .from('checklist_plantilla')
    .insert([{
      maquina_id: dto.maquina_id,
      nombre_item: dto.nombre_item,
      categoria: dto.categoria,
      orden: dto.orden,
      activo: true
    }])
    .select()
    .single()
  
  if (error) throw error
  return data as ChecklistPlantilla
}

export async function actualizarItemPlantilla(id: string, dto: ActualizarItemPlantillaDTO): Promise<ChecklistPlantilla> {
  const { data, error } = await supabase
    .from('checklist_plantilla')
    .update(dto)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data as ChecklistPlantilla
}

export async function eliminarItemPlantilla(id: string): Promise<void> {
  const { error } = await supabase
    .from('checklist_plantilla')
    .delete()
    .eq('id', id)
  if (error) throw error
}
