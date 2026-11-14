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

describe('Cada fila muestra título, responsable y estado', () => {
  it('SC-5 · muestra los tres datos, con el estado por su nombre', async () => {
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
  it('SC-7 SC-8 · con nombre se ve el nombre; sin nombre, las iniciales y nunca el email', async () => {
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
  it('SC-25 · no hay forma de crear, renombrar ni eliminar estados', async () => {
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
})

describe('Las tareas más recientes van primero', () => {
  it('SC-10 · las filas se pintan en el orden que devuelve la API', async () => {
    serveTasks([
      aTask({ title: 'C' }),
      aTask({ title: 'B' }),
      aTask({ title: 'A' }),
    ])

    renderWithSession(<TasksPage />)

    const titles = (await rows()).map(
      (row) => row.firstElementChild?.textContent,
    )
    expect(titles).toEqual(['C', 'B', 'A'])
  })
})

describe('La lista no muestra fechas ni presencia', () => {
  it('SC-11 · ninguna fila muestra una fecha ni una marca de vencida', async () => {
    serveTasks([aTask(), aTask({ status: 'done' })])

    renderWithSession(<TasksPage />)

    for (const row of await rows()) {
      expect(row.textContent).not.toMatch(/\d{1,2}[/-]\d{1,2}|\d{4}|vencid/i)
    }
  })

  it('SC-12 · no hay señales de quién está en línea ni de actividad por persona', async () => {
    serveTasks([aTask()])

    renderWithSession(<TasksPage />)
    await rows()

    expect(
      screen.queryByText(/en línea|conectad|online|activ|última vez|hace \d/i),
    ).not.toBeInTheDocument()
  })
})

describe('La lista vacía explica qué es y ofrece crear la primera tarea', () => {
  it('SC-13 · sin tareas se ve un texto explicativo y el formulario, no una lista vacía', async () => {
    serveTasks([])

    renderWithSession(<TasksPage />)

    expect(
      await screen.findByText(
        /aquí verás en qué anda cada persona del equipo/i,
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(/crea la primera tarea/i)).toBeInTheDocument()
    expect(
      screen.getByRole('form', { name: 'Nueva tarea' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('list', { name: 'Tareas' }),
    ).not.toBeInTheDocument()
  })
})
