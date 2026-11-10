import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppRoutes } from '@/routes/app-routes'
import { renderWithSession } from '@/test/render'

describe('La lista exige haber iniciado sesión', () => {
  it('sin sesión, abrir la lista lleva al inicio de sesión sin mostrar tareas', async () => {
    renderWithSession(<AppRoutes />, { user: null, route: '/' })

    expect(await screen.findByText('Inicia sesión')).toBeInTheDocument()
    expect(
      screen.queryByRole('list', { name: 'Tareas' }),
    ).not.toBeInTheDocument()
  })
})
