import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    'Faltan las variables de entorno VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY.\n' +
    'Copia .env.example → .env.local y completa los valores de tu proyecto Supabase.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    // Persiste la sesión en localStorage — el usuario no necesita re-loguearse
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Re-exportar para uso conveniente
export type { Session, User } from '@supabase/supabase-js'
