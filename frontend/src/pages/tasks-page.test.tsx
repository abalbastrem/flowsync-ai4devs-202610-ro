import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import { ApiError, createTask, getTasks } from '@/lib/api'
import { AppRoutes } from '@/routes/app-routes'
import type { Task } from '@/lib/types'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  getTasks: vi.fn(),
  createTask: vi.fn(),
}))

const task = (overrides: Partial<Task>): Task => ({
  id: 1,
  title: 'A task',
  status: 'pending',
  assignee: null,
  dueDate: null,
  createdAt: '2026-11-01T10:00:00.000+00:00',
  updatedAt: '2026-11-01T10:00:00.000+00:00',
  ...overrides,
})

const auth = (overrides: Partial<AuthContextValue> = {}): AuthContextValue => ({
  user: {
    id: 1,
    fullName: 'Grace Hopper',
    email: 'grace@example.com',
    initials: 'GH',
    createdAt: '2026-11-01T10:00:00.000+00:00',
    updatedAt: '2026-11-01T10:00:00.000+00:00',
  },
  token: 'a-token',
  status: 'authenticated',
  sessionError: null,
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
  ...overrides,
})

const renderAt = (path: string, value = auth()) =>
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AuthContext.Provider>,
  )

describe('task list page', () => {
  beforeEach(() => {
    vi.mocked(getTasks).mockReset()
  })

  it('shows each task with its title, assignee, status and due date', async () => {
    vi.mocked(getTasks).mockResolvedValue([
      task({
        title: 'Fix login',
        status: 'in_progress',
        assignee: { id: 2, fullName: 'Ada Lovelace', initials: 'AL' },
        dueDate: '2026-11-05T00:00:00.000+00:00',
      }),
    ])

    renderAt('/tasks')

    expect(await screen.findByText('Fix login')).toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('En curso')).toBeInTheDocument()
    expect(screen.getByText('5 nov 2026')).toBeInTheDocument()
  })

  it('shows a pending task with no assignee as free', async () => {
    vi.mocked(getTasks).mockResolvedValue([task({ title: 'Free task' })])

    renderAt('/tasks')

    expect(await screen.findByText('Free task')).toBeInTheDocument()
    expect(screen.getByText('Libre')).toBeInTheDocument()
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
  })

  it('is the page a logged-in user lands on', async () => {
    vi.mocked(getTasks).mockResolvedValue([task({ title: 'Landing task' })])

    renderAt('/')

    expect(await screen.findByText('Landing task')).toBeInTheDocument()
  })

  it('sends a user who is not logged in to the login page', () => {
    renderAt('/tasks', auth({ user: null, token: null, status: 'anonymous' }))

    expect(screen.getByText('Inicia sesión')).toBeInTheDocument()
    expect(getTasks).not.toHaveBeenCalled()
  })
})

describe('creating a task', () => {
  beforeEach(() => {
    vi.mocked(getTasks).mockReset().mockResolvedValue([])
    vi.mocked(createTask).mockReset()
  })

  const submit = async (title: string) => {
    const user = userEvent.setup()
    renderAt('/tasks')

    const input = await screen.findByLabelText('Nueva tarea')
    if (title) await user.type(input, title)
    await user.click(screen.getByRole('button', { name: 'Crear' }))
  }

  it('adds the new task to the list when submitting a title', async () => {
    vi.mocked(createTask).mockResolvedValue(task({ title: 'Fix login' }))

    await submit('Fix login')

    expect(await screen.findByText('Fix login')).toBeInTheDocument()
    expect(createTask).toHaveBeenCalledWith('a-token', 'Fix login')
    expect(screen.getByLabelText('Nueva tarea')).toHaveValue('')
  })

  it.each([
    ['empty', ''],
    ['blank', '   '],
  ])('creates nothing and shows an error for a %s title', async (_, title) => {
    await submit(title)

    expect(await screen.findByText('Escribe un título.')).toBeInTheDocument()
    expect(createTask).not.toHaveBeenCalled()
  })

  it('shows the error when the server rejects the title', async () => {
    vi.mocked(createTask).mockRejectedValue(
      new ApiError('Título no válido.', 422, { title: 'Título no válido.' }),
    )

    await submit('Fix login')

    expect(await screen.findByText('Título no válido.')).toBeInTheDocument()
  })
})
