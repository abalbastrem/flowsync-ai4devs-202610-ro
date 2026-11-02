import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import {
  ApiError,
  createTask,
  getTasks,
  takeTask,
  updateTaskDetails,
} from '@/lib/api'
import { AppRoutes } from '@/routes/app-routes'
import type { Task } from '@/lib/types'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  getTasks: vi.fn(),
  createTask: vi.fn(),
  takeTask: vi.fn(),
  updateTaskDetails: vi.fn(),
}))

const POLL_MS = 3000

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

const renderList = (value = auth()) =>
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/tasks']}>
        <AppRoutes />
      </MemoryRouter>
    </AuthContext.Provider>,
  )

const nextPoll = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(POLL_MS)
  })

const setVisibility = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: state,
  })
  return act(async () => {
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(0)
  })
}

const deferred = <T,>() => {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((resolver) => {
    resolve = resolver
  })
  return { promise, resolve }
}

const typingUser = () =>
  userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

describe('keeping the list up to date', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(getTasks).mockReset()
    vi.mocked(createTask).mockReset()
    vi.mocked(takeTask).mockReset()
    vi.mocked(updateTaskDetails).mockReset()
  })

  afterEach(async () => {
    await setVisibility('visible')
    vi.useRealTimers()
  })

  it('shows a task someone else created, without reloading', async () => {
    vi.mocked(getTasks).mockResolvedValue([task({ title: 'Old task' })])
    renderList()
    await screen.findByText('Old task')

    vi.mocked(getTasks).mockResolvedValue([
      task({ title: 'Old task' }),
      task({ id: 2, title: 'New task' }),
    ])
    await nextPoll()

    expect(screen.getByText('New task')).toBeInTheDocument()
  })

  it('shows a task someone else changed', async () => {
    vi.mocked(getTasks).mockResolvedValue([task({ title: 'Old title' })])
    renderList()
    await screen.findByText('Old title')

    vi.mocked(getTasks).mockResolvedValue([
      task({
        title: 'New title',
        status: 'in_progress',
        assignee: { id: 2, fullName: 'Ada Lovelace', initials: 'AL' },
      }),
    ])
    await nextPoll()

    expect(screen.getByText('New title')).toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.queryByText('Old title')).not.toBeInTheDocument()
  })

  it('removes a task someone else deleted', async () => {
    vi.mocked(getTasks).mockResolvedValue([task({ title: 'A task' })])
    renderList()
    await screen.findByText('A task')

    vi.mocked(getTasks).mockResolvedValue([])
    await nextPoll()

    expect(screen.queryByText('A task')).not.toBeInTheDocument()
    expect(screen.getByText('Todavía no hay tareas.')).toBeInTheDocument()
  })

  it('applies the active filter to what arrives', async () => {
    vi.mocked(getTasks).mockResolvedValue([task({ title: 'A task' })])
    const user = typingUser()
    renderList()
    await user.click(await screen.findByRole('button', { name: 'Pendiente' }))

    vi.mocked(getTasks).mockResolvedValue([
      task({ title: 'A task', status: 'done' }),
      task({ id: 2, title: 'New pending task' }),
      task({ id: 3, title: 'New done task', status: 'done' }),
    ])
    await nextPoll()

    expect(screen.getByText('New pending task')).toBeInTheDocument()
    expect(screen.queryByText('New done task')).not.toBeInTheDocument()
    expect(screen.queryByText('A task')).not.toBeInTheDocument()
  })

  it('keeps the text being edited when the list refreshes', async () => {
    vi.mocked(getTasks).mockResolvedValue([task({ title: 'A task' })])
    const user = typingUser()
    renderList()
    await user.click(
      await screen.findByRole('button', { name: 'Editar A task' }),
    )
    const field = screen.getByRole('textbox', { name: 'Título de A task' })
    await user.clear(field)
    await user.type(field, 'Half typed')

    await nextPoll()

    const current = screen.getByRole('textbox', { name: 'Título de A task' })
    expect(current).toHaveValue('Half typed')
    expect(current).toHaveFocus()
  })

  it('closes the edit and says so if someone else deletes that task', async () => {
    vi.mocked(getTasks).mockResolvedValue([task({ title: 'A task' })])
    const user = typingUser()
    renderList()
    await user.click(
      await screen.findByRole('button', { name: 'Editar A task' }),
    )

    vi.mocked(getTasks).mockResolvedValue([])
    await nextPoll()

    expect(screen.getByText('Esta tarea ya no existe.')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /Título/ })).toBeNull()
  })

  it('does not let a response started before my change overwrite it', async () => {
    vi.mocked(getTasks).mockResolvedValue([task({ id: 7, title: 'A task' })])
    const user = typingUser()
    renderList()
    await screen.findByText('A task')

    const staleResponse = deferred<Task[]>()
    vi.mocked(getTasks).mockReturnValue(staleResponse.promise)
    await nextPoll()

    vi.mocked(takeTask).mockResolvedValue(
      task({
        id: 7,
        title: 'A task',
        status: 'in_progress',
        assignee: { id: 1, fullName: 'Grace Hopper', initials: 'GH' },
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Take' }))
    await screen.findByText('Grace Hopper')

    await act(async () => {
      staleResponse.resolve([task({ id: 7, title: 'A task' })])
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(screen.getByText('Grace Hopper')).toBeInTheDocument()
    expect(screen.queryByText('Libre')).not.toBeInTheDocument()
  })

  it('does not let a response started before I created a task hide it', async () => {
    vi.mocked(getTasks).mockResolvedValue([])
    const user = typingUser()
    renderList()
    await screen.findByLabelText('Nueva tarea')

    const staleResponse = deferred<Task[]>()
    vi.mocked(getTasks).mockReturnValue(staleResponse.promise)
    await nextPoll()

    vi.mocked(createTask).mockResolvedValue(task({ title: 'My new task' }))
    await user.type(screen.getByLabelText('Nueva tarea'), 'My new task')
    await user.click(screen.getByRole('button', { name: 'Crear' }))
    await screen.findByText('My new task')

    await act(async () => {
      staleResponse.resolve([])
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(screen.getByText('My new task')).toBeInTheDocument()
  })

  it('does not start a new request while the previous one is pending', async () => {
    vi.mocked(getTasks).mockResolvedValue([task({ title: 'A task' })])
    renderList()
    await screen.findByText('A task')

    vi.mocked(getTasks).mockClear()
    vi.mocked(getTasks).mockReturnValue(new Promise(() => {}))
    await nextPoll()
    await nextPoll()
    await nextPoll()

    expect(getTasks).toHaveBeenCalledTimes(1)
  })

  it('stops asking while the tab is hidden and refreshes as soon as it is visible', async () => {
    vi.mocked(getTasks).mockResolvedValue([task({ title: 'Old task' })])
    renderList()
    await screen.findByText('Old task')

    await setVisibility('hidden')
    vi.mocked(getTasks).mockClear()
    await nextPoll()
    await nextPoll()
    expect(getTasks).not.toHaveBeenCalled()

    vi.mocked(getTasks).mockResolvedValue([task({ title: 'New task' })])
    await setVisibility('visible')

    expect(getTasks).toHaveBeenCalledTimes(1)
    expect(screen.getByText('New task')).toBeInTheDocument()
  })

  it('keeps the list and tries again if a refresh fails', async () => {
    vi.mocked(getTasks).mockResolvedValue([task({ title: 'A task' })])
    renderList()
    await screen.findByText('A task')

    vi.mocked(getTasks).mockRejectedValue(new ApiError('Sin conexión.', 0))
    await nextPoll()

    expect(screen.getByText('A task')).toBeInTheDocument()

    vi.mocked(getTasks).mockResolvedValue([task({ title: 'New title' })])
    await nextPoll()

    expect(screen.getByText('New title')).toBeInTheDocument()
  })

  it('recovers by itself if the first load failed', async () => {
    vi.mocked(getTasks).mockRejectedValue(new ApiError('Sin conexión.', 0))
    renderList()
    await screen.findByText('Sin conexión.')

    vi.mocked(getTasks).mockResolvedValue([task({ title: 'A task' })])
    await nextPoll()

    expect(screen.getByText('A task')).toBeInTheDocument()
    expect(screen.queryByText('Sin conexión.')).not.toBeInTheDocument()
  })

  it('closes the session if a refresh gets a 401', async () => {
    vi.mocked(getTasks).mockResolvedValue([task({ title: 'A task' })])
    const value = auth()
    renderList(value)
    await screen.findByText('A task')

    vi.mocked(getTasks).mockRejectedValue(new ApiError('Caducada.', 401))
    await nextPoll()

    await waitFor(() => expect(value.logout).toHaveBeenCalled())
  })

  it('stops asking when leaving the page', async () => {
    vi.mocked(getTasks).mockResolvedValue([task({ title: 'A task' })])
    const { unmount } = renderList()
    await screen.findByText('A task')

    unmount()
    vi.mocked(getTasks).mockClear()
    await nextPoll()
    await nextPoll()

    expect(getTasks).not.toHaveBeenCalled()
  })
})
