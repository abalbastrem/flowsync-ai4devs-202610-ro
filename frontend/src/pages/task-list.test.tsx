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

describe('Cada fila muestra título, responsable y estado', () => {
  it('muestra los tres datos, con el estado por su nombre', async () => {
    serveTasks([
      aTask({ title: 'Escribir el PRD', status: 'pending' }),
      aTask({
        title: 'Revisar el PR',
        status: 'in_progress',
        assignee: { id: 2, fullName: 'Bruno Díaz', initials: 'BD' },
      }),
      aTask({ title: 'Desplegar', status: 'done' }),
    ])

    renderWithSession(<TasksPage />)

    const [first, second, third] = await rows()
    expect(within(first).getByText('Escribir el PRD')).toBeInTheDocument()
    expect(within(first).getByText('Ana García')).toBeInTheDocument()
    expect(within(first).getByText('Pendiente')).toBeInTheDocument()
    expect(within(second).getByText('Bruno Díaz')).toBeInTheDocument()
    expect(within(second).getByText('En curso')).toBeInTheDocument()
    expect(within(third).getByText('Hecho')).toBeInTheDocument()
  })
})

describe('El responsable se identifica por su nombre', () => {
  it('con nombre se ve el nombre; sin nombre, las iniciales y nunca el email', async () => {
    serveTasks([
      aTask({ title: 'Con nombre' }),
      aTask({
        title: 'Sin nombre',
        assignee: { id: 3, fullName: null, initials: 'XA' },
      }),
    ])

    renderWithSession(<TasksPage />)

    const [withName, withoutName] = await rows()
    expect(within(withName).getByText('Ana García')).toBeInTheDocument()
    expect(within(withoutName).getByText('XA')).toBeInTheDocument()
    expect(screen.queryByText(/@/)).not.toBeInTheDocument()
  })
})

describe('Solo existen tres estados fijos', () => {
  it('no hay forma de crear, renombrar ni eliminar estados', async () => {
    serveTasks([
      aTask({ status: 'pending' }),
      aTask({ status: 'in_progress' }),
      aTask({ status: 'done' }),
    ])

    renderWithSession(<TasksPage />)
    await rows()

    const buttons = screen.getAllByRole('button').map((b) => b.textContent)
    expect(buttons).toEqual(['Crear tarea'])
    expect(screen.queryByText(/estado/i)).not.toBeInTheDocument()
  })

  it('las filas solo usan las etiquetas «Pendiente», «En curso» y «Hecho»', async () => {
    serveTasks([
      aTask({ status: 'pending' }),
      aTask({ status: 'in_progress' }),
      aTask({ status: 'done' }),
    ])

    renderWithSession(<TasksPage />)

    const labels = (await rows()).map(
      (row) => row.lastElementChild?.textContent,
    )
    expect(labels).toEqual(['Pendiente', 'En curso', 'Hecho'])
  })
})
