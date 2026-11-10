import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { TasksPage } from '@/pages/tasks-page'
import { API, server } from '@/test/server'
import { renderWithSession } from '@/test/render'
import { aTask } from '@/test/tasks'

const created = aTask({ title: 'Recién creada' })

const createOk = http.post(`${API}/tasks`, () =>
  HttpResponse.json({ data: created }, { status: 201 }),
)

async function createTask(title: string) {
  await userEvent.type(await screen.findByLabelText('Título'), title)
  await userEvent.click(screen.getByRole('button', { name: 'Crear tarea' }))
}

describe('Cuando la carga de la lista falla', () => {
  it('lo explica y permite reintentar', async () => {
    let calls = 0
    server.use(
      http.get(`${API}/tasks`, () => {
        calls++
        return calls === 1
          ? HttpResponse.json({}, { status: 500 })
          : HttpResponse.json({ data: [aTask({ title: 'Ya existía' })] })
      }),
    )

    renderWithSession(<TasksPage />)

    await userEvent.click(
      await screen.findByRole('button', { name: 'Reintentar' }),
    )
    expect(await screen.findByText('Ya existía')).toBeInTheDocument()
  })

  it('crear una tarea no hace pasar la nueva por la lista completa', async () => {
    let calls = 0
    server.use(
      http.get(`${API}/tasks`, () => {
        calls++
        return calls === 1
          ? HttpResponse.json({}, { status: 500 })
          : HttpResponse.json({
              data: [created, aTask({ title: 'Ya existía' })],
            })
      }),
      createOk,
    )

    renderWithSession(<TasksPage />)
    await screen.findByRole('button', { name: 'Reintentar' })

    await createTask('Recién creada')

    const list = await screen.findByRole('list', { name: 'Tareas' })
    await within(list).findByText('Ya existía')
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
  })
})

describe('Crear mientras la lista todavía está cargando', () => {
  it('una respuesta de carga antigua no borra la tarea recién creada', async () => {
    let releaseFirst!: () => void
    const firstHeld = new Promise<void>((resolve) => (releaseFirst = resolve))
    let calls = 0
    server.use(
      http.get(`${API}/tasks`, async () => {
        calls++
        if (calls === 1) {
          // Esta respuesta se calculó antes del alta: no la contiene.
          await firstHeld
          return HttpResponse.json({ data: [] })
        }
        return HttpResponse.json({ data: [created] })
      }),
      createOk,
    )

    renderWithSession(<TasksPage />)
    await createTask('Recién creada')
    await screen.findByText('Recién creada')

    releaseFirst()
    // Dejar que la respuesta antigua llegue y se procese.
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(screen.getByText('Recién creada')).toBeInTheDocument()
  })
})

describe('Cuando la sesión ha caducado', () => {
  it('un 401 al cargar la lista cierra la sesión', async () => {
    const logout = vi.fn(async () => undefined)
    server.use(
      http.get(`${API}/tasks`, () => HttpResponse.json({}, { status: 401 })),
    )

    renderWithSession(<TasksPage />, { auth: { logout } })

    await vi.waitFor(() => expect(logout).toHaveBeenCalled())
  })

  it('un 401 al crear una tarea cierra la sesión', async () => {
    const logout = vi.fn(async () => undefined)
    server.use(
      http.get(`${API}/tasks`, () => HttpResponse.json({ data: [] })),
      http.post(`${API}/tasks`, () => HttpResponse.json({}, { status: 401 })),
    )

    renderWithSession(<TasksPage />, { auth: { logout } })
    await createTask('Lo que sea')

    await vi.waitFor(() => expect(logout).toHaveBeenCalled())
  })
})
