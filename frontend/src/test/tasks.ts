import type { Task } from '@/lib/types'

let nextId = 1

/** Construye una tarea con la forma exacta que devuelve el backend. */
export function aTask(overrides: Partial<Task> = {}): Task {
  return {
    id: nextId++,
    title: 'Una tarea',
    status: 'pending',
    assignee: { id: 1, fullName: 'Ana García', initials: 'AG' },
    ...overrides,
  }
}
