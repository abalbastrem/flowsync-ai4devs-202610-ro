import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { TasksPage } from '@/pages/tasks-page'
import { API, server } from '@/test/server'
import { ANA, renderWithSession } from '@/test/render'
import { aTask } from '@/test/tasks'

describe('Crear una tarea con solo el título', () => {
  it('el formulario de alta solo pide el título', async () => {
    server.use(http.get(`${API}/tasks`, () => HttpResponse.json({ data: [] })))

    renderWithSession(<TasksPage />)

    const form = await screen.findByRole('form', { name: 'Nueva tarea' })
    expect(form.querySelectorAll('input, select, textarea')).toHaveLength(1)
    expect(screen.getByLabelText('Título')).toBeInTheDocument()
  })

  it('no ofrece responsable, estado ni fecha', async () => {
    server.use(http.get(`${API}/tasks`, () => HttpResponse.json({ data: [] })))

    renderWithSession(<TasksPage />)

    await screen.findByRole('form', { name: 'Nueva tarea' })
    expect(screen.queryByLabelText(/responsable/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/estado/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/fecha/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('crear envía una petición que solo contiene el título', async () => {
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
  it('aparece la primera de la lista, a mi nombre y en «Pendiente», sin volver a pedir la lista', async () => {
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
