import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { TasksPage } from '@/pages/tasks-page'
import { API, server } from '@/test/server'
import { ANA, renderWithSession } from '@/test/render'
import { aTask } from '@/test/tasks'

describe('Crear una tarea con solo el título', () => {
  it('SC-18 · el formulario de alta solo pide el título', async () => {
    server.use(http.get(`${API}/tasks`, () => HttpResponse.json({ data: [] })))

    renderWithSession(<TasksPage />)

    const form = await screen.findByRole('form', { name: 'Nueva tarea' })
    expect(form.querySelectorAll('input, select, textarea')).toHaveLength(1)
    expect(screen.getByLabelText('Título')).toBeInTheDocument()
  })

  it('SC-18 · no ofrece responsable, estado ni fecha', async () => {
    server.use(http.get(`${API}/tasks`, () => HttpResponse.json({ data: [] })))

    renderWithSession(<TasksPage />)

    await screen.findByRole('form', { name: 'Nueva tarea' })
    expect(screen.queryByLabelText(/responsable/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/estado/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/fecha/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('SC-17 · crear envía una petición que solo contiene el título', async () => {
    let body: unknown
    server.use(
      http.get(`${API}/tasks`, () => HttpResponse.json({ data: [] })),
      http.post(`${API}/tasks`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(
          {
            data: {
              id: 1,
              title: 'Preparar la demo',
              status: 'pending',
              assignee: {
                id: ANA.id,
                fullName: ANA.fullName,
                initials: ANA.initials,
              },
            },
          },
          { status: 201 },
        )
      }),
    )

    renderWithSession(<TasksPage />)

    await userEvent.type(
      await screen.findByLabelText('Título'),
      'Preparar la demo',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Crear tarea' }))

    await expect.poll(() => body).toEqual({ title: 'Preparar la demo' })
  })
})

describe('La tarea creada se ve sin recargar', () => {
  it('SC-21 SC-22 · aparece la primera de la lista, a mi nombre y en «Pendiente», sin volver a pedir la lista', async () => {
    let listRequests = 0
    server.use(
      http.get(`${API}/tasks`, () => {
        listRequests++
        return HttpResponse.json({
          data: [aTask({ title: 'Tarea anterior' })],
        })
      }),
      http.post(`${API}/tasks`, () =>
        HttpResponse.json(
          {
            data: aTask({
              title: 'Recién creada',
              status: 'pending',
              assignee: {
                id: ANA.id,
                fullName: ANA.fullName,
                initials: ANA.initials,
              },
            }),
          },
          { status: 201 },
        ),
      ),
    )

    renderWithSession(<TasksPage />)
    await screen.findByText('Tarea anterior')

    await userEvent.type(screen.getByLabelText('Título'), 'Recién creada')
    await userEvent.click(screen.getByRole('button', { name: 'Crear tarea' }))

    const list = screen.getByRole('list', { name: 'Tareas' })
    const [first] = await within(list).findAllByRole('listitem')
    await within(first).findByText('Recién creada')
    expect(within(first).getByText('Ana García')).toBeInTheDocument()
    expect(within(first).getByText('Pendiente')).toBeInTheDocument()
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(listRequests).toBe(1)
  })
})

async function typeAndCreate(title: string) {
  await userEvent.type(await screen.findByLabelText('Título'), title)
  await userEvent.click(screen.getByRole('button', { name: 'Crear tarea' }))
}

describe('Si la lista no se puede cargar, se explica y se puede reintentar', () => {
  it('SC-26 · si el servidor no responde, lo explica sin términos técnicos y «Reintentar» trae la lista', async () => {
    let calls = 0
    server.use(
      http.get(`${API}/tasks`, () => {
        calls++
        return calls === 1
          ? HttpResponse.error()
          : HttpResponse.json({ data: [aTask({ title: 'Ya existía' })] })
      }),
    )

    renderWithSession(<TasksPage />)

    const retry = await screen.findByRole('button', { name: 'Reintentar' })
    const alert = retry.closest('[role="alert"]') ?? retry.parentElement!
    expect(alert).toHaveTextContent(/no se pudo conectar/i)
    expect(alert).toHaveTextContent(/inténtalo de nuevo/i)
    expect(alert).not.toHaveTextContent(/backend/i)

    await userEvent.click(retry)
    expect(await screen.findByText('Ya existía')).toBeInTheDocument()
  })
})

describe('Si la creación falla, se explica y no se pierde lo escrito', () => {
  it('SC-27 · si crear falla, lo explica y el título sigue en el campo', async () => {
    server.use(
      http.get(`${API}/tasks`, () =>
        HttpResponse.json({ data: [aTask({ title: 'Ya existía' })] }),
      ),
      http.post(`${API}/tasks`, () => HttpResponse.json({}, { status: 500 })),
    )

    renderWithSession(<TasksPage />)
    await screen.findByText('Ya existía')
    await typeAndCreate('No se guardará')

    expect(
      await screen.findByText(/algo ha ido mal en el servidor/i),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Título')).toHaveValue('No se guardará')
    const list = screen.getByRole('list', { name: 'Tareas' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(within(list).queryByText('No se guardará')).not.toBeInTheDocument()
  })
})

describe('Una carga más antigua no hace desaparecer la tarea creada', () => {
  it('SC-28 · una respuesta de carga antigua no borra la tarea recién creada', async () => {
    const created = aTask({ title: 'Recién creada' })
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
      http.post(`${API}/tasks`, () =>
        HttpResponse.json({ data: created }, { status: 201 }),
      ),
    )

    renderWithSession(<TasksPage />)
    await typeAndCreate('Recién creada')
    await screen.findByText('Recién creada')

    releaseFirst()
    // Dejar que la respuesta antigua llegue y se procese.
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(screen.getByText('Recién creada')).toBeInTheDocument()
  })
})
