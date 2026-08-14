// ============================================================
//  CONSTANTES
// ============================================================
import type { TipoTurno, EstadoMaquina, SeveridadAnom, EstadoAnom, ValorItem } from '@/types'

export const TURNO_LABELS: Record<TipoTurno, string> = {
  'mañana': 'Mañana',
  'tarde':  'Tarde',
  'noche':  'Noche',
}

export const TURNO_HORARIO: Record<TipoTurno, string> = {
  'mañana': '06:00 – 14:00',
  'tarde':  '14:00 – 22:00',
  'noche':  '22:00 – 06:00',
}

export const ESTADO_MAQUINA_LABEL: Record<EstadoMaquina, string> = {
  ok:               'Operativa',
  revisar:          'Revisar',
  critico:          'Crítico',
  fuera_de_servicio:'Fuera de servicio',
}

export const ESTADO_MAQUINA_COLOR: Record<EstadoMaquina, string> = {
  ok:               '#1D9E75',
  revisar:          '#EF9F27',
  critico:          '#E24B4A',
  fuera_de_servicio:'#6B6B6B',
}

export const SEVERIDAD_LABEL: Record<SeveridadAnom, string> = {
  baja:  'Baja',
  media: 'Media',
  alta:  'Alta',
}

export const SEVERIDAD_COLOR: Record<SeveridadAnom, string> = {
  baja:  '#1D9E75',
  media: '#EF9F27',
  alta:  '#E24B4A',
}

export const ESTADO_ANOM_LABEL: Record<EstadoAnom, string> = {
  abierta:     'Abierta',
  en_revision: 'En revisión',
  resuelta:    'Resuelta',
  descartada:  'Descartada',
}

export const VALOR_ITEM_LABEL: Record<ValorItem, string> = {
  ok:      'OK',
  regular: 'Regular',
  malo:    'Malo',
}

export const VALOR_ITEM_COLOR: Record<ValorItem, string> = {
  ok:      '#1D9E75',
  regular: '#EF9F27',
  malo:    '#E24B4A',
}

import type { CategoriaMantenimiento } from '@/types'

export const CATEGORIA_LABEL: Record<CategoriaMantenimiento, string> = {
  mecanico:    'Mecánico',
  electrico:   'Eléctrico',
  lubricacion: 'Lubricación',
  limpieza:    'Limpieza',
  general:     'General',
  otro:        'Otro',
}

export const CATEGORIA_COLOR: Record<CategoriaMantenimiento, string> = {
  mecanico:    '#3B82F6', // Blue
  electrico:   '#EAB308', // Yellow
  lubricacion: '#8B5CF6', // Purple
  limpieza:    '#06B6D4', // Cyan
  general:     '#64748B', // Slate
  otro:        '#F97316', // Orange
}
