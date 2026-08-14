import { useCallback } from 'react'
import { useAuthStore, useUIStore } from '@/store'
import { abrirTurno as apiAbrir, cerrarTurno as apiCerrar } from '@/api/turnos'
import type { TipoTurno } from '@/types'

// ============================================================
//  useTurno
//  - Expone el turno activo del store
//  - abrir / cerrar turno actualizan el store y muestran toasts
// ============================================================

export function useTurno() {
  const { usuario, turnoActivo, setTurnoActivo } = useAuthStore()
  const addToast = useUIStore(s => s.addToast)

  const abrir = useCallback(async (tipo: TipoTurno) => {
    if (!usuario) throw new Error('No hay usuario autenticado')
    if (turnoActivo) {
      addToast({ type: 'warning', message: 'Ya tienes un turno abierto' })
      return turnoActivo
    }

    try {
      const turno = await apiAbrir(usuario.id, { tipo })
      setTurnoActivo(turno)
      addToast({ type: 'success', message: `Turno ${tipo} abierto correctamente` })
      return turno
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al abrir turno'
      addToast({ type: 'error', message: msg })
      throw err
    }
  }, [usuario, turnoActivo, setTurnoActivo, addToast])

  const cerrar = useCallback(async (observaciones?: string) => {
    if (!turnoActivo) {
      addToast({ type: 'warning', message: 'No hay turno activo para cerrar' })
      return
    }

    try {
      await apiCerrar(turnoActivo.id, observaciones)
      setTurnoActivo(null)
      addToast({ type: 'success', message: 'Turno cerrado correctamente' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cerrar turno'
      addToast({ type: 'error', message: msg })
      throw err
    }
  }, [turnoActivo, setTurnoActivo, addToast])

  return {
    turnoActivo,
    hayTurnoAbierto: !!turnoActivo,
    abrir,
    cerrar,
  }
}
