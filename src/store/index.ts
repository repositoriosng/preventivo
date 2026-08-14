import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Usuario, Turno } from '@/types'

// ============================================================
//  AUTH STORE — sesión y turno activo
// ============================================================

interface AuthStore {
  usuario:     Usuario | null
  turnoActivo: Turno   | null
  loading:     boolean

  setUsuario:     (u: Usuario | null) => void
  setTurnoActivo: (t: Turno   | null) => void
  setLoading:     (v: boolean)        => void
  reset:          ()                  => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      usuario:     null,
      turnoActivo: null,
      loading:     true,

      setUsuario:     (usuario)     => set({ usuario }),
      setTurnoActivo: (turnoActivo) => set({ turnoActivo }),
      setLoading:     (loading)     => set({ loading }),
      reset: () => set({ usuario: null, turnoActivo: null, loading: false }),
    }),
    {
      name: 'maple-auth',
      // Solo persistir el usuario, el turno lo recargamos desde Supabase
      partialize: (s) => ({ usuario: s.usuario }),
    }
  )
)

// ============================================================
//  UI STORE — estado global de la interfaz
// ============================================================

interface UIStore {
  sidebarOpen:   boolean
  toasts:        Toast[]
  setSidebar:    (open: boolean) => void
  addToast:      (t: Omit<Toast, 'id'>) => void
  removeToast:   (id: string) => void
}

export interface Toast {
  id:      string
  type:    'success' | 'error' | 'warning' | 'info'
  message: string
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: false,
  toasts:      [],

  setSidebar: (open) => set({ sidebarOpen: open }),

  addToast: (t) => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }))
    // Auto-remover después de 4 segundos
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter(x => x.id !== id) }))
    }, 4000)
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter(x => x.id !== id) })),
}))
