import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { AppRoutes } from '@/routes/app-routes'
import { API, server } from '@/test/server'
import { renderWithSession } from '@/test/render'

describe('Hay una sola lista de tareas', () => {
  it('la navegación solo ofrece la lista del equipo y el perfil, sin vista «mis tareas»', async () => {
    server.use(http.get(`${API}/tasks`, () => HttpResponse.json({ data: [] })))

    renderWithSession(<AppRoutes />, { route: '/' })

    const nav = await screen.findByRole('navigation', { name: 'Principal' })
    const links = within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent)
    expect(links).toEqual(['Tareas', 'Perfil'])
    expect(screen.queryByText(/mis tareas/i)).not.toBeInTheDocument()
  })
})
