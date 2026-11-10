import type { TaskStatus } from '@/lib/types'

/**
 * Las etiquetas de los tres estados fijos. Es el único sitio del frontend
 * donde se enumeran: no existe forma de añadir, renombrar ni quitar estados.
 */
export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Hecho',
}
