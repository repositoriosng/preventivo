import { supabase } from './supabase'
import type {
  ChecklistRegistro,
  GuardarChecklistDTO,
  ResultadoCheck,
  ValorItem,
} from '@/types'

// Calcula el resultado general en base a los valores de los ítems
function calcularResultado(items: { valor: ValorItem }[]): ResultadoCheck {
  if (items.some(i => i.valor === 'malo'))    return 'critico'
  if (items.some(i => i.valor === 'regular')) return 'revisar'
  return 'ok'
}

// Guarda el checklist completo en una transacción (cabecera + ítems)
export async function guardarChecklist(
  operadorId: string,
  dto: GuardarChecklistDTO
): Promise<ChecklistRegistro> {
  const resultado = calcularResultado(dto.items)

  // 1. Insertar cabecera
  const { data: registro, error: errReg } = await supabase
    .from('checklist_registro')
    .insert({
      turno_id:          dto.turno_id,
      maquina_id:        dto.maquina_id,
      operador_id:       operadorId,
      observaciones:     dto.observaciones,
      foto_url:          dto.foto_url,
      resultado_general: resultado,
    })
    .select()
    .single()

  if (errReg) throw errReg

  // 2. Insertar respuestas por ítem
  const respuestas = dto.items.map(item => ({
    registro_id:       registro.id,
    plantilla_item_id: item.plantilla_item_id,
    valor:             item.valor,
    nota:              item.nota,
  }))

  const { error: errItems } = await supabase
    .from('checklist_item_respuesta')
    .insert(respuestas)

  if (errItems) throw errItems

  // 3. Actualizar última revisión de la máquina
  await supabase
    .from('maquinas')
    .update({
      ultima_revision: new Date().toISOString(),
      estado_actual:   resultado === 'critico' ? 'critico'
                     : resultado === 'revisar' ? 'revisar'
                     : 'ok',
    })
    .eq('id', dto.maquina_id)

  return registro as ChecklistRegistro
}

// Historial de checklists de una máquina
export async function getChecklistsMaquina(
  maquinaId: string,
  limit = 20
): Promise<ChecklistRegistro[]> {
  const { data, error } = await supabase
    .from('checklist_registro')
    .select(`
      *,
      operador:usuarios(id, nombre),
      items:checklist_item_respuesta(*, plantilla_item:checklist_plantilla(*))
    `)
    .eq('maquina_id', maquinaId)
    .order('fecha_hora', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as ChecklistRegistro[]
}

// Checklists del turno actual
export async function getChecklistsTurno(
  turnoId: string
): Promise<ChecklistRegistro[]> {
  const { data, error } = await supabase
    .from('checklist_registro')
    .select('*, maquina:maquinas(id, nombre, codigo)')
    .eq('turno_id', turnoId)
    .order('fecha_hora', { ascending: false })
  if (error) throw error
  return data as ChecklistRegistro[]
}

// Stats: cuántos checklists se hicieron hoy
export async function getCountChecklistsHoy(): Promise<number> {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const { count, error } = await supabase
    .from('checklist_registro')
    .select('*', { count: 'exact', head: true })
    .gte('fecha_hora', hoy.toISOString())

  if (error) throw error
  return count ?? 0
}
