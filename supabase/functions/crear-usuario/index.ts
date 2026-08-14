import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Falta el token de autorización')
    }

    const body = await req.json()
    const { accion } = body

    // ── ELIMINAR usuario ──────────────────────────────────────────
    if (accion === 'eliminar') {
      const { userId } = body

      if (!userId) {
        throw new Error('Falta el campo userId')
      }

      // Intentar borrar de auth.users - ignorar errores (puede no existir)
      try {
        await supabaseClient.auth.admin.deleteUser(userId)
      } catch (_) {
        // Ignoramos: el usuario puede no existir en auth.users si fue creado con SQL directo
      }

      // Siempre borrar de public.usuarios
      const { error: publicError } = await supabaseClient.from('usuarios').delete().eq('id', userId)
      if (publicError) throw publicError

      return new Response(
        JSON.stringify({ message: 'Usuario eliminado exitosamente' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // ── CAMBIAR PASSWORD ──────────────────────────────────────────
    if (accion === 'cambiar_password') {
      const { userId, newPassword } = body
      
      if (!userId || !newPassword) {
        throw new Error('Faltan campos requeridos: userId o newPassword')
      }

      // 1. Obtener el email desde public.usuarios
      const { data: publicUser, error: queryError } = await supabaseClient
        .from('usuarios')
        .select('email')
        .eq('id', userId)
        .single()
        
      if (queryError || !publicUser) {
        throw new Error('No se encontró el usuario en la base de datos.')
      }

      // 2. Usar el admin API de Supabase para actualizar la contraseña (usuarios ya reparados)
      const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      )

      if (updateError) {
        throw new Error('Error al actualizar contraseña: ' + updateError.message)
      }

      return new Response(
        JSON.stringify({ message: 'Contraseña actualizada exitosamente' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }



    // ── CREAR usuario ─────────────────────────────────────────────
    const { email, password, nombre, rol } = body

    if (!email || !password || !nombre || !rol) {
      throw new Error('Faltan campos requeridos: email, password, nombre o rol')
    }

    const { data: userData, error: createError } = await supabaseClient.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    })

    if (createError) {
      console.error('Error creating user in Auth:', createError)
      throw createError
    }

    const newUserId = userData.user.id

    const { data: profileData, error: profileError } = await supabaseClient
      .from('usuarios')
      .upsert([
        {
          id: newUserId,
          email: email,
          nombre: nombre,
          rol: rol,
          activo: true
        }
      ], { onConflict: 'id' })
      .select()

    if (profileError) {
      console.error('Error creating user profile:', profileError)
      throw profileError
    }

    return new Response(
      JSON.stringify({ 
        message: 'Usuario creado exitosamente',
        user: userData.user,
        profile: profileData ? profileData[0] : null
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : 
                     (error?.message || JSON.stringify(error))
    
    console.error('Edge Function Error:', errorMsg)
    return new Response(
      JSON.stringify({ error: errorMsg }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
