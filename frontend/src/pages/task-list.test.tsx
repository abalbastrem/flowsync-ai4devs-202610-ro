import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { TasksPage } from '@/pages/tasks-page'
import type { Task } from '@/lib/types'
import { API, server } from '@/test/server'
import { renderWithSession } from '@/test/render'
import { aTask } from '@/test/tasks'

function serveTasks(tasks: Task[]) {
  server.use(http.get(`${API}/tasks`, () => HttpResponse.json({ data: tasks })))
}

async function rows() {
  const list = await screen.findByRole('list', { name: 'Tareas' })
  return within(list).getAllByRole('listitem')
}

describe('La lista es la misma para todos los miembros', () => {
  it('pinta todas las tareas que devuelve la API, sin filtrar por usuario', async () => {
    serveTasks([
      aTask({ title: 'Tarea de Ana' }),
      aTask({
        title: 'Tarea de Bruno',
        assignee: { id: 2, fullName: 'Bruno Díaz', initials: 'BD' },
      }),
    ])

    renderWithSession(<TasksPage />)

    const items = await rows()
    expect(items).toHaveLength(2)
    expect(screen.getByText('Tarea de Ana')).toBeInTheDocument()
    expect(screen.getByText('Tarea de Bruno')).toBeInTheDocument()
  })
})
