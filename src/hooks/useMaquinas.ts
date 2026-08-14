import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMaquinas, getMaquina, getPlantillaChecklist, actualizarEstadoMaquina } from '@/api/maquinas'
import { guardarChecklist } from '@/api/checklist'
import { useUIStore } from '@/store'
import { useAuth } from './useAuth'
import type { GuardarChecklistDTO, EstadoMaquina } from '@/types'

// ============================================================
//  Query keys centralizadas — evitan typos y facilitan invalidar
// ============================================================
export const MaquinaKeys = {
  all:       ['maquinas'] as const,
  detail:    (id: string) => ['maquinas', id] as const,
  plantilla: (id: string) => ['maquinas', id, 'plantilla'] as const,
}

// ============================================================
//  useMaquinas — lista completa
// ============================================================
export function useMaquinas() {
  return useQuery({
    queryKey: MaquinaKeys.all,
    queryFn:  getMaquinas,
    staleTime: 1000 * 60 * 5, // 5 min — el catálogo cambia poco
  })
}

// ============================================================
//  useMaquina — detalle de una máquina
// ============================================================
export function useMaquina(id: string) {
  return useQuery({
    queryKey: MaquinaKeys.detail(id),
    queryFn:  () => getMaquina(id),
    enabled:  !!id,
  })
}

// ============================================================
//  usePlantillaChecklist — ítems del checklist de una máquina
// ============================================================
export function usePlantillaChecklist(maquinaId: string) {
  return useQuery({
    queryKey: MaquinaKeys.plantilla(maquinaId),
    queryFn:  () => getPlantillaChecklist(maquinaId),
    enabled:  !!maquinaId,
    staleTime: 1000 * 60 * 10, // 10 min — la plantilla cambia muy poco
  })
}

// ============================================================
//  useGuardarChecklist — mutation para guardar el checklist
// ============================================================
export function useGuardarChecklist() {
  const qc       = useQueryClient()
  const addToast = useUIStore(s => s.addToast)
  const { usuario } = useAuth()

  return useMutation({
    mutationFn: (dto: GuardarChecklistDTO) => {
      if (!usuario) throw new Error('No autenticado')
      return guardarChecklist(usuario.id, dto)
    },
    onSuccess: (_, variables) => {
      // Invalidar la máquina para que se actualice su estado
      qc.invalidateQueries({ queryKey: MaquinaKeys.detail(variables.maquina_id) })
      qc.invalidateQueries({ queryKey: MaquinaKeys.all })
      addToast({ type: 'success', message: 'Checklist guardado correctamente' })
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Error al guardar checklist'
      addToast({ type: 'error', message: msg })
    },
  })
}

// ============================================================
//  useActualizarEstadoMaquina — mutation para supervisores
// ============================================================
export function useActualizarEstadoMaquina() {
  const qc       = useQueryClient()
  const addToast = useUIStore(s => s.addToast)

  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: EstadoMaquina }) =>
      actualizarEstadoMaquina(id, estado),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: MaquinaKeys.detail(data.id) })
      qc.invalidateQueries({ queryKey: MaquinaKeys.all })
      addToast({ type: 'success', message: 'Estado de máquina actualizado' })
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Error al actualizar estado'
      addToast({ type: 'error', message: msg })
    },
  })
}
