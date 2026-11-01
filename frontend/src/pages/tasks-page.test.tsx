import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import {
  ApiError,
  createTask,
  getTasks,
  takeTask,
  updateTaskStatus,
} from '@/lib/api'
import { AppRoutes } from '@/routes/app-routes'
import type { Task } from '@/lib/types'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  getTasks: vi.fn(),
  createTask: vi.fn(),
  takeTask: vi.fn(),
  updateTaskStatus: vi.fn(),
}))

const statusOf = (title: string) =>
  screen.getByRole('combobox', { name: `Estado de ${title}` })

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
    expect(statusOf('Fix login')).toHaveValue('in_progress')
    expect(screen.getByText('5 nov 2026')).toBeInTheDocument()
  })

  it('shows a pending task with no assignee as free', async () => {
    vi.mocked(getTasks).mockResolvedValue([task({ title: 'Free task' })])

    renderAt('/tasks')

    expect(await screen.findByText('Free task')).toBeInTheDocument()
    expect(screen.getByText('Libre')).toBeInTheDocument()
    expect(statusOf('Free task')).toHaveValue('pending')
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

describe('when a request fails', () => {
  beforeEach(() => {
    vi.mocked(getTasks).mockReset()
    vi.mocked(createTask).mockReset()
  })

  it('shows the error and does not offer to create tasks if the list fails to load', async () => {
    vi.mocked(getTasks).mockRejectedValue(new ApiError('Sin conexión.', 0))

    renderAt('/tasks')

    expect(await screen.findByText('Sin conexión.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nueva tarea')).not.toBeInTheDocument()
  })

  it('closes the session if loading the list gets a 401', async () => {
    vi.mocked(getTasks).mockRejectedValue(new ApiError('Caducada.', 401))
    const value = auth()

    renderAt('/tasks', value)

    await waitFor(() => expect(value.logout).toHaveBeenCalled())
  })

  it('closes the session if creating a task gets a 401', async () => {
    vi.mocked(getTasks).mockResolvedValue([])
    vi.mocked(createTask).mockRejectedValue(new ApiError('Caducada.', 401))
    const value = auth()
    const user = userEvent.setup()

    renderAt('/tasks', value)
    await user.type(await screen.findByLabelText('Nueva tarea'), 'Fix login')
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    await waitFor(() => expect(value.logout).toHaveBeenCalled())
  })

  it('tells loading apart from an empty list', async () => {
    let resolve: (tasks: Task[]) => void = () => {}
    vi.mocked(getTasks).mockReturnValue(
      new Promise((resolver) => {
        resolve = resolver
      }),
    )

    renderAt('/tasks')

    expect(screen.getByText('Cargando tareas…')).toBeInTheDocument()

    resolve([])

    expect(
      await screen.findByText('Todavía no hay tareas.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Cargando tareas…')).not.toBeInTheDocument()
  })
})

describe('taking a task', () => {
  const me = { id: 1, fullName: 'Grace Hopper', initials: 'GH' }

  beforeEach(() => {
    vi.mocked(getTasks).mockReset()
    vi.mocked(takeTask).mockReset()
  })

  it('shows a free task in progress with me as its assignee after one click', async () => {
    vi.mocked(getTasks).mockResolvedValue([task({ id: 7, title: 'Free task' })])
    vi.mocked(takeTask).mockResolvedValue(
      task({ id: 7, title: 'Free task', status: 'in_progress', assignee: me }),
    )
    const user = userEvent.setup()

    renderAt('/tasks')
    await user.click(await screen.findByRole('button', { name: 'Take' }))

    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument()
    expect(statusOf('Free task')).toHaveValue('in_progress')
    expect(screen.queryByText('Libre')).not.toBeInTheDocument()
    expect(takeTask).toHaveBeenCalledWith('a-token', 7)
  })

  it('does not offer Take on a task in progress assigned to me', async () => {
    vi.mocked(getTasks).mockResolvedValue([
      task({ title: 'My task', status: 'in_progress', assignee: me }),
    ])

    renderAt('/tasks')

    expect(await screen.findByText('My task')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Take' }),
    ).not.toBeInTheDocument()
  })

  it('shows an assignee with no name by their initials', async () => {
    vi.mocked(getTasks).mockResolvedValue([
      task({
        status: 'in_progress',
        assignee: { id: 2, fullName: null, initials: 'AL' },
      }),
    ])

    renderAt('/tasks')

    expect(await screen.findByText('AL')).toBeInTheDocument()
  })

  it('closes the session if taking a task gets a 401', async () => {
    vi.mocked(getTasks).mockResolvedValue([task({ title: 'Free task' })])
    vi.mocked(takeTask).mockRejectedValue(new ApiError('Caducada.', 401))
    const value = auth()
    const user = userEvent.setup()

    renderAt('/tasks', value)
    await user.click(await screen.findByRole('button', { name: 'Take' }))

    await waitFor(() => expect(value.logout).toHaveBeenCalled())
  })
})

describe('changing a task status', () => {
  const me = { id: 1, fullName: 'Grace Hopper', initials: 'GH' }

  beforeEach(() => {
    vi.mocked(getTasks).mockReset()
    vi.mocked(updateTaskStatus).mockReset()
  })

  it('shows me as the assignee when I set a task in progress', async () => {
    vi.mocked(getTasks).mockResolvedValue([task({ id: 7, title: 'A task' })])
    vi.mocked(updateTaskStatus).mockResolvedValue(
      task({ id: 7, title: 'A task', status: 'in_progress', assignee: me }),
    )
    const user = userEvent.setup()

    renderAt('/tasks')
    await screen.findByText('A task')
    await user.selectOptions(statusOf('A task'), 'En curso')

    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument()
    expect(statusOf('A task')).toHaveValue('in_progress')
    expect(updateTaskStatus).toHaveBeenCalledWith('a-token', 7, 'in_progress')
  })

  it('shows a task as free when I set it to pending', async () => {
    vi.mocked(getTasks).mockResolvedValue([
      task({ id: 7, title: 'A task', status: 'in_progress', assignee: me }),
    ])
    vi.mocked(updateTaskStatus).mockResolvedValue(
      task({ id: 7, title: 'A task', status: 'pending' }),
    )
    const user = userEvent.setup()

    renderAt('/tasks')
    await screen.findByText('A task')
    await user.selectOptions(statusOf('A task'), 'Pendiente')

    expect(await screen.findByText('Libre')).toBeInTheDocument()
    expect(screen.queryByText('Grace Hopper')).not.toBeInTheDocument()
    expect(statusOf('A task')).toHaveValue('pending')
  })

  it('shows a task with no assignee and not as free when I set it to done', async () => {
    vi.mocked(getTasks).mockResolvedValue([
      task({ id: 7, title: 'A task', status: 'in_progress', assignee: me }),
    ])
    vi.mocked(updateTaskStatus).mockResolvedValue(
      task({ id: 7, title: 'A task', status: 'done' }),
    )
    const user = userEvent.setup()

    renderAt('/tasks')
    await screen.findByText('A task')
    await user.selectOptions(statusOf('A task'), 'Hecha')

    expect(await screen.findByText('—')).toBeInTheDocument()
    expect(screen.queryByText('Grace Hopper')).not.toBeInTheDocument()
    expect(screen.queryByText('Libre')).not.toBeInTheDocument()
    expect(statusOf('A task')).toHaveValue('done')
  })

  it('does not offer Take on a done task', async () => {
    vi.mocked(getTasks).mockResolvedValue([
      task({ title: 'Done task', status: 'done' }),
    ])

    renderAt('/tasks')

    expect(await screen.findByText('Done task')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Take' }),
    ).not.toBeInTheDocument()
  })

  it('shows the error and keeps the previous status if the change fails', async () => {
    vi.mocked(getTasks).mockResolvedValue([task({ id: 7, title: 'A task' })])
    vi.mocked(updateTaskStatus).mockRejectedValue(
      new ApiError('Sin conexión.', 0),
    )
    const user = userEvent.setup()

    renderAt('/tasks')
    await screen.findByText('A task')
    await user.selectOptions(statusOf('A task'), 'Hecha')

    expect(await screen.findByText('Sin conexión.')).toBeInTheDocument()
    expect(statusOf('A task')).toHaveValue('pending')
  })

  it('closes the session if the change gets a 401', async () => {
    vi.mocked(getTasks).mockResolvedValue([task({ title: 'A task' })])
    vi.mocked(updateTaskStatus).mockRejectedValue(
      new ApiError('Caducada.', 401),
    )
    const value = auth()
    const user = userEvent.setup()

    renderAt('/tasks', value)
    await screen.findByText('A task')
    await user.selectOptions(statusOf('A task'), 'Hecha')

    await waitFor(() => expect(value.logout).toHaveBeenCalled())
  })

  // Dos respuestas que llegan desordenadas dejarían en pantalla el estado que no toca.
  it('does not allow another change until the current one has finished', async () => {
    let resolve: (updated: Task) => void = () => {}
    vi.mocked(getTasks).mockResolvedValue([task({ id: 7, title: 'A task' })])
    vi.mocked(updateTaskStatus).mockReturnValue(
      new Promise((resolver) => {
        resolve = resolver
      }),
    )
    const user = userEvent.setup()

    renderAt('/tasks')
    await screen.findByText('A task')
    await user.selectOptions(statusOf('A task'), 'Hecha')

    expect(statusOf('A task')).toBeDisabled()

    resolve(task({ id: 7, title: 'A task', status: 'done' }))

    await waitFor(() => expect(statusOf('A task')).toBeEnabled())
    expect(statusOf('A task')).toHaveValue('done')
  })
})

describe('changing a task someone else is on', () => {
  const ada = { id: 2, fullName: 'Ada Lovelace', initials: 'AL' }
  const me = { id: 1, fullName: 'Grace Hopper', initials: 'GH' }
  const adasTask = task({
    id: 7,
    title: 'A task',
    status: 'in_progress',
    assignee: ada,
  })

  beforeEach(() => {
    vi.mocked(getTasks).mockReset().mockResolvedValue([adasTask])
    vi.mocked(takeTask).mockReset()
    vi.mocked(updateTaskStatus).mockReset()
  })

  const openList = async () => {
    const user = userEvent.setup()
    renderAt('/tasks')
    await screen.findByText('A task')
    return user
  }

  it('asks to confirm and says who has it when taking the task', async () => {
    const user = await openList()

    await user.click(screen.getByRole('button', { name: 'Take' }))

    expect(await screen.findByRole('alertdialog')).toHaveTextContent(
      'Ada Lovelace',
    )
    expect(takeTask).not.toHaveBeenCalled()
  })

  it('asks to confirm and says who has it when changing the status', async () => {
    const user = await openList()

    await user.selectOptions(statusOf('A task'), 'Hecha')

    expect(await screen.findByRole('alertdialog')).toHaveTextContent(
      'Ada Lovelace',
    )
    expect(updateTaskStatus).not.toHaveBeenCalled()
  })

  it('says who has it by their initials if they have no name', async () => {
    vi.mocked(getTasks).mockResolvedValue([
      { ...adasTask, assignee: { ...ada, fullName: null } },
    ])
    const user = await openList()

    await user.selectOptions(statusOf('A task'), 'Hecha')

    expect(await screen.findByRole('alertdialog')).toHaveTextContent('AL')
  })

  it('takes the task when I confirm', async () => {
    vi.mocked(takeTask).mockResolvedValue({ ...adasTask, assignee: me })
    const user = await openList()

    await user.click(screen.getByRole('button', { name: 'Take' }))
    await user.click(await screen.findByRole('button', { name: 'Continuar' }))

    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(takeTask).toHaveBeenCalledWith('a-token', 7)
  })

  it('changes the status when I confirm', async () => {
    vi.mocked(updateTaskStatus).mockResolvedValue({
      ...adasTask,
      status: 'done',
      assignee: null,
    })
    const user = await openList()

    await user.selectOptions(statusOf('A task'), 'Hecha')
    await user.click(await screen.findByRole('button', { name: 'Continuar' }))

    await waitFor(() => expect(statusOf('A task')).toHaveValue('done'))
    expect(updateTaskStatus).toHaveBeenCalledWith('a-token', 7, 'done')
  })

  it('sends nothing and keeps the task as it was when I cancel a status change', async () => {
    const user = await openList()

    await user.selectOptions(statusOf('A task'), 'Hecha')
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    )
    expect(updateTaskStatus).not.toHaveBeenCalled()
    expect(statusOf('A task')).toHaveValue('in_progress')
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
  })

  it('sends nothing when I cancel taking the task', async () => {
    const user = await openList()

    await user.click(screen.getByRole('button', { name: 'Take' }))
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    )
    expect(takeTask).not.toHaveBeenCalled()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
  })

  it('does not ask to confirm when the task is mine', async () => {
    vi.mocked(getTasks).mockResolvedValue([{ ...adasTask, assignee: me }])
    vi.mocked(updateTaskStatus).mockResolvedValue({
      ...adasTask,
      status: 'done',
      assignee: null,
    })
    const user = await openList()

    await user.selectOptions(statusOf('A task'), 'Hecha')

    await waitFor(() =>
      expect(updateTaskStatus).toHaveBeenCalledWith('a-token', 7, 'done'),
    )
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('does not ask to confirm when the task is free', async () => {
    vi.mocked(getTasks).mockResolvedValue([task({ id: 7, title: 'A task' })])
    vi.mocked(takeTask).mockResolvedValue({ ...adasTask, assignee: me })
    const user = await openList()

    await user.click(screen.getByRole('button', { name: 'Take' }))

    await waitFor(() => expect(takeTask).toHaveBeenCalledWith('a-token', 7))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
