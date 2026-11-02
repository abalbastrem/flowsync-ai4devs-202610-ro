import { startVisit } from '@/lib/api'
import type { TaskChange } from '@/lib/types'

/**
 * Una visita dura lo que la carga de la página: empezarla consume sus cambios en
 * el servidor, así que se pide una vez por sesión y se reutiliza. Por eso sobrevive
 * a ir a otra página de la app y volver, y al doble efecto de StrictMode.
 */
let current: { token: string; changes: Promise<TaskChange[]> } | null = null

export function visitChanges(token: string): Promise<TaskChange[]> {
  if (current?.token === token) return current.changes

  const visit = {
    token,
    changes: startVisit(token).catch((cause: unknown) => {
      // Si falla, el servidor no ha consumido nada: se puede volver a intentar.
      if (current === visit) current = null
      throw cause
    }),
  }
  current = visit

  return visit.changes
}

export function forgetVisit() {
  current = null
}
