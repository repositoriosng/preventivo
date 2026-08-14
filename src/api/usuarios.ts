import { supabase } from './supabase'
import type { LoginDTO, Usuario } from '@/types'

export interface CrearUsuarioDTO {
  email:     string
  password:  string
  nombre:    string
  rol:       'admin' | 'supervisor' | 'operador'
}

// --- Auth ---

export async function login({ email, password }: LoginDTO) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export async function crearUsuarioAdmin(dto: CrearUsuarioDTO) {
  const { data, error } = await supabase.functions.invoke('crear-usuario', {
    body: dto
  })
  
  if (error) throw error
  return data
}

export async function eliminarUsuario(userId: string) {
  const { data, error } = await supabase.functions.invoke('crear-usuario', {
    body: { accion: 'eliminar', userId }
  })
  
  if (error) throw error
  return data
}

export async function resetearPasswordAdmin(userId: string, newPassword: string) {
  const { data, error } = await supabase.functions.invoke('crear-usuario', {
    body: { accion: 'cambiar_password', userId, newPassword }
  })
  
  if (error) throw error
  return data
}

// --- Perfil ---

export async function getPerfil(id: string): Promise<Usuario> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Usuario
}

export async function getOperadores(): Promise<Usuario[]> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nombre, email, rol, turno_preferido, activo')
    .eq('activo', true)
    .order('nombre')
  if (error) throw error
  return data as Usuario[]
}

export async function getTodosLosUsuarios(): Promise<Usuario[]> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .order('creado_en', { ascending: false })
  if (error) throw error
  return data as Usuario[]
}

export async function actualizarPerfil(
  id: string,
  updates: Partial<Pick<Usuario, 'nombre' | 'turno_preferido'>>
): Promise<Usuario> {
  const { data, error } = await supabase
    .from('usuarios')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Usuario
}

export async function actualizarUsuarioAdmin(
  id: string,
  updates: Partial<Pick<Usuario, 'nombre' | 'rol' | 'activo'>>
): Promise<Usuario> {
  const { data, error } = await supabase
    .from('usuarios')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Usuario
}

// Escuchar cambios de sesión (para el store)
export function onAuthChange(
  callback: (usuario: Usuario | null) => void
) {
  const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      try {
        const perfil = await getPerfil(session.user.id)
        callback(perfil)
      } catch {
        callback(null)
      }
    } else {
      callback(null)
    }
  })

  return data.subscription
}
