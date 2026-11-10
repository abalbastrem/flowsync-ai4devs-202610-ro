import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import type { User } from '@/lib/types'

export const ANA: User = {
  id: 1,
  fullName: 'Ana García',
  email: 'ana@example.com',
  initials: 'AG',
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
}

export const TOKEN = 'test-token'

/**
 * Renderiza con una sesión ya resuelta, sin pasar por la rehidratación del
 * token: los tests de pantalla no deben depender de `GET /account/profile`.
 */
export function renderWithSession(
  ui: React.ReactNode,
  {
    user = ANA,
    route = '/',
    auth = {},
  }: {
    user?: User | null
    route?: string
    auth?: Partial<AuthContextValue>
  } = {},
) {
  const value: AuthContextValue = {
    user,
    token: user ? TOKEN : null,
    status: user ? 'authenticated' : 'anonymous',
    sessionError: null,
    login: async () => undefined,
    signup: async () => undefined,
    logout: async () => undefined,
    ...auth,
  }

  return render(
    <AuthContext value={value}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </AuthContext>,
  )
}
