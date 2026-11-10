import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { TasksPage } from '@/pages/tasks-page'
import { API, server } from '@/test/server'
import { ANA, renderWithSession } from '@/test/render'

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
              assignee: { id: ANA.id, fullName: ANA.fullName, initials: ANA.initials },
            },
          },
          { status: 201 },
        )
      }),
    )

    renderWithSession(<TasksPage />)

    await userEvent.type(await screen.findByLabelText('Título'), 'Preparar la demo')
    await userEvent.click(screen.getByRole('button', { name: 'Crear tarea' }))

    await expect.poll(() => body).toEqual({ title: 'Preparar la demo' })
  })
})
