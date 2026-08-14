import { useEffect, useCallback } from 'react'
import { useAuthStore, useUIStore } from '@/store'
import { login as apiLogin, logout as apiLogout, onAuthChange, getPerfil } from '@/api/usuarios'
import { getTurnoActivo } from '@/api/turnos'
import type { LoginDTO } from '@/types'

// ============================================================
//  useAuth
//  - Inicializa la sesión al montar la app
//  - Expone login / logout
//  - Carga el turno activo tras autenticar
// ============================================================

export function useAuthInit() {
  const { setUsuario, setTurnoActivo, setLoading } = useAuthStore()

  useEffect(() => {
    let mounted = true
    // loading starts as true (set in store default), no need to set again

    // onAuthStateChange dispara INITIAL_SESSION automáticamente al registrarse,
    // por lo que no necesitamos llamar a getSession() manualmente.
    // Esto evita la condición de carrera entre bootstrapAuth y el listener.
    let subscription: { unsubscribe: () => void } | undefined
    try {
      subscription = onAuthChange(async (perfil) => {
        if (!mounted) return

        console.debug('[useAuth] onAuthChange perfil', perfil)
        setUsuario(perfil)

        if (perfil) {
          try {
            const turno = await getTurnoActivo(perfil.id)
            if (mounted) setTurnoActivo(turno)
          } catch {
            if (mounted) setTurnoActivo(null)
          }
        } else {
          if (mounted) setTurnoActivo(null)
        }

        if (mounted) {
          console.debug('[useAuth] auth ready, loading = false')
          setLoading(false)
        }
      })
    } catch (err) {
      console.debug('[useAuth] onAuthChange registration failed', err)
      if (mounted) {
        setUsuario(null)
        setTurnoActivo(null)
        setLoading(false)
      }
    }

    console.debug('[useAuth] listener registered')

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [setUsuario, setTurnoActivo, setLoading])
}

export function useAuth() {
  const { usuario, turnoActivo, loading, setUsuario, setLoading, reset } = useAuthStore()
  const addToast = useUIStore(s => s.addToast)

  const login = useCallback(async (dto: LoginDTO) => {
    try {
      setLoading(true)
      await apiLogin(dto)
      // onAuthChange se dispara automáticamente y carga el perfil
    } catch (err: unknown) {
      // Supabase AuthError puede no ser instanceof Error en algunos entornos
      let msg = 'Credenciales incorrectas. Verifica tu email y contraseña.'
      if (err instanceof Error && err.message && err.message.trim() !== '') {
        msg = err.message
      } else if (err && typeof err === 'object' && 'message' in err) {
        const m = (err as { message: unknown }).message
        if (typeof m === 'string' && m.trim() !== '') msg = m
      }
      addToast({ type: 'error', message: msg })
      setLoading(false)
      throw err
    }
  }, [addToast, setLoading])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
      reset()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cerrar sesión'
      addToast({ type: 'error', message: msg })
    }
  }, [addToast, reset])

  const recargarPerfil = useCallback(async () => {
    if (!usuario) return
    try {
      const perfil = await getPerfil(usuario.id)
      setUsuario(perfil)
    } catch {
      addToast({ type: 'error', message: 'No se pudo actualizar el perfil' })
    }
  }, [usuario, setUsuario, addToast])

  return {
    usuario,
    turnoActivo,
    loading,
    esSupervisor: usuario?.rol === 'supervisor' || usuario?.rol === 'admin',
    esAdmin:      usuario?.rol === 'admin',
    login,
    logout,
    recargarPerfil,
  }
}
