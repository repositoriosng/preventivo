// ============================================================
//  TIPOS DE DOMINIO — Maple Mantenimiento
//  Espeja exactamente los enums y tablas del schema SQL
// ============================================================

// --- Enums (mismos valores que PostgreSQL) ---
export type RolUsuario    = 'operador' | 'supervisor' | 'admin'
export type TipoTurno     = 'mañana' | 'tarde' | 'noche'
export type EstadoTurno   = 'abierto' | 'cerrado'
export type EstadoMaquina = 'ok' | 'revisar' | 'critico' | 'fuera_de_servicio'
export type ValorItem     = 'ok' | 'regular' | 'malo'
export type SeveridadAnom = 'baja' | 'media' | 'alta'
export type EstadoAnom    = 'abierta' | 'en_revision' | 'resuelta' | 'descartada'
export type ResultadoCheck = 'ok' | 'revisar' | 'critico'
export type FrecuenciaPreventivo = 'diaria' | 'semanal' | 'mensual'
export type EstadoMantenimiento  = 'programado' | 'completado' | 'omitido'
export type CategoriaMantenimiento = 'mecanico' | 'electrico' | 'lubricacion' | 'limpieza' | 'general' | 'otro'

// --- Entidades principales ---

export interface Usuario {
  id:              string
  nombre:          string
  email:           string
  rol:             RolUsuario
  turno_preferido: TipoTurno | null
  activo:          boolean
  creado_en:       string
  actualizado_en:  string
}

export interface Maquina {
  id:              string
  nombre:          string
  codigo:          string
  area:            string
  descripcion:     string | null
  estado_actual:   EstadoMaquina
  ultima_revision: string | null
  activa:          boolean
  creado_en:       string
}

export interface Turno {
  id:            string
  operador_id:   string
  tipo:          TipoTurno
  inicio:        string
  fin:           string | null
  observaciones: string | null
  estado:        EstadoTurno
  creado_en:     string
  // joins opcionales
  operador?:     Pick<Usuario, 'id' | 'nombre'>
}

export interface ChecklistPlantilla {
  id:          string
  maquina_id:  string
  nombre_item: string
  categoria:   string
  orden:       number
  activo:      boolean
  creado_en:   string
}

export interface ChecklistRegistro {
  id:               string
  turno_id:         string
  maquina_id:       string
  operador_id:      string
  fecha_hora:       string
  observaciones:    string | null
  foto_url:         string | null
  resultado_general: ResultadoCheck
  creado_en:        string
  // joins opcionales
  maquina?:         Pick<Maquina, 'id' | 'nombre' | 'codigo'>
  operador?:        Pick<Usuario, 'id' | 'nombre'>
  items?:           ChecklistItemRespuesta[]
}

export interface ChecklistItemRespuesta {
  id:                string
  registro_id:       string
  plantilla_item_id: string
  valor:             ValorItem
  nota:              string | null
  creado_en:         string
  // join opcional
  plantilla_item?:   ChecklistPlantilla
}

export interface Anomalia {
  id:            string
  turno_id:      string
  maquina_id:    string
  reportado_por: string
  asignado_a:    string | null
  descripcion:   string
  severidad:     SeveridadAnom
  categoria:     CategoriaMantenimiento
  estado:        EstadoAnom
  foto_url:      string | null
  creado_en:     string
  resuelto_en:   string | null
  // joins opcionales
  maquina?:      Pick<Maquina, 'id' | 'nombre' | 'codigo'>
  reportado_por_usuario?: Pick<Usuario, 'id' | 'nombre'>
  asignado_a_usuario?:    Pick<Usuario, 'id' | 'nombre'>
  historial?:    HistorialEstado[]
}

export interface HistorialEstado {
  id:              string
  anomalia_id:     string
  usuario_id:      string
  estado_anterior: EstadoAnom | null
  estado_nuevo:    EstadoAnom
  comentario:      string | null
  cambiado_en:     string
  // join opcional
  usuario?:        Pick<Usuario, 'id' | 'nombre'>
}

// --- DTOs para formularios ---

export interface LoginDTO {
  email:    string
  password: string
}

export interface AbrirTurnoDTO {
  tipo: TipoTurno
}

export interface GuardarChecklistDTO {
  turno_id:      string
  maquina_id:    string
  observaciones?: string
  foto_url?:     string
  items: {
    plantilla_item_id: string
    valor:             ValorItem
    nota?:             string
  }[]
}

export interface ReportarAnomaliaDTO {
  turno_id:    string
  maquina_id:  string
  descripcion: string
  severidad:   SeveridadAnom
  categoria:   CategoriaMantenimiento
  foto_url?:   string
}

export interface ActualizarAnomaliaDTO {
  estado:      EstadoAnom
  asignado_a?: string
  comentario?: string
}

export interface CrearMaquinaDTO {
  nombre:      string
  codigo:      string
  area:        string
  descripcion?: string
}

export interface ActualizarMaquinaDTO {
  nombre?:      string
  codigo?:      string
  area?:        string
  descripcion?: string
  estado_actual?: EstadoMaquina
  activa?:      boolean
}

export interface CrearItemPlantillaDTO {
  maquina_id:  string
  nombre_item: string
  categoria:   string
  orden:       number
}

export interface ActualizarItemPlantillaDTO {
  nombre_item?: string
  categoria?:   string
  orden?:       number
  activo?:      boolean
}

// --- Mantenimiento Preventivo ---

export interface PlanPreventivo {
  id:            string
  maquina_id:    string
  titulo:        string
  descripcion:   string | null
  categoria:     CategoriaMantenimiento
  frecuencia:    FrecuenciaPreventivo
  proxima_fecha: string   // date string 'YYYY-MM-DD'
  activo:        boolean
  creado_por:    string
  creado_en:     string
  // joins
  maquina?:  Pick<Maquina, 'id' | 'nombre' | 'codigo' | 'area'>
  creador?:  Pick<Usuario, 'id' | 'nombre'>
}

export interface MantenimientoPreventivo {
  id:               string
  plan_id:          string
  maquina_id:       string
  fecha_programada: string   // 'YYYY-MM-DD'
  estado:           EstadoMantenimiento
  realizado_por:    string | null
  realizado_en:     string | null
  observaciones:    string | null
  creado_en:        string
  // joins
  plan?:         Pick<PlanPreventivo, 'id' | 'titulo' | 'frecuencia' | 'categoria'>
  maquina?:      Pick<Maquina, 'id' | 'nombre' | 'codigo' | 'area'>
  realizadoPor?: Pick<Usuario, 'id' | 'nombre'>
}


// --- Estado del store ---

export interface AuthState {
  usuario:   Usuario | null
  turnoActivo: Turno | null
  loading:   boolean
}

// --- Stats para dashboard ---

export interface DashboardStats {
  checklistsHoy:     number
  anomaliasAbiertas: number
  anomaliasAlta:     number
  maquinasOk:        number
  maquinasRev:       number
  maquinasCritico:   number
}
