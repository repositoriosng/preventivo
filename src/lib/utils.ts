import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// ============================================================
//  FECHAS
// ============================================================

export function formatFecha(iso: string): string {
  return format(parseISO(iso), "d MMM yyyy, HH:mm", { locale: es })
}

export function formatFechaCorta(iso: string): string {
  return format(parseISO(iso), "d MMM", { locale: es })
}

export function formatHora(iso: string): string {
  return format(parseISO(iso), "HH:mm", { locale: es })
}

export function formatRelativo(iso: string): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: es })
}

export function inicioDelDia(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

// ============================================================
//  CLASES CSS (Tailwind-like helpers)
// ============================================================

/** Combina clases, filtrando falsy values */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

// ============================================================
//  MISC
// ============================================================

/** Retorna las iniciales de un nombre para avatares */
export function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase() ?? '')
    .join('')
}

/** Genera un color de avatar consistente basado en el nombre */
export function colorAvatar(nombre: string): string {
  const colores = ['#1D9E75','#3B82F6','#8B5CF6','#F59E0B','#EF4444','#06B6D4']
  const idx = nombre.charCodeAt(0) % colores.length
  return colores[idx]
}
