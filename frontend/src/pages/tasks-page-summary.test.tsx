import { StrictMode } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import { ApiError, getTasks, startVisit } from '@/lib/api'
import { forgetVisit } from '@/lib/visit'
import { AppRoutes } from '@/routes/app-routes'
import type { TaskChange } from '@/lib/types'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  getTasks: vi.fn(),
  startVisit: vi.fn(),
}))

const SUMMARY = 'Cambios desde tu última visita'

const ada = { id: 2, fullName: 'Ada Lovelace', initials: 'AL' }

const change = (overrides: Partial<TaskChange>): TaskChange => ({
  id: 1,
  kind: 'created',
  taskTitle: 'A task',
  oldValue: null,
  newValue: null,
  actor: ada,
  createdAt: '2026-11-01T10:00:00.000+00:00',
  ...overrides,
})

const auth = (): AuthContextValue => ({
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
})

const renderList = (value = auth()) =>
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/tasks']}>
        <AppRoutes />
      </MemoryRouter>
    </AuthContext.Provider>,
  )

describe('summary of what changed since my last visit', () => {
  beforeEach(() => {
    forgetVisit()
    vi.mocked(getTasks).mockReset().mockResolvedValue([])
    vi.mocked(startVisit).mockReset().mockResolvedValue([])
  })

  it.each<[string, Partial<TaskChange>, string]>([
    ['creating', { kind: 'created' }, 'Ada Lovelace creó «A task»'],
    [
      'renaming',
      { kind: 'title', oldValue: 'Old', newValue: 'A task' },
      'Ada Lovelace renombró «Old» a «A task»',
    ],
    ['taking', { kind: 'taken' }, 'Ada Lovelace cogió «A task»'],
    [
      'moving to pending',
      { kind: 'status', oldValue: 'in_progress', newValue: 'pending' },
      'Ada Lovelace pasó «A task» a Pendiente',
    ],
    [
      'finishing',
      { kind: 'status', oldValue: 'in_progress', newValue: 'done' },
      'Ada Lovelace pasó «A task» a Hecha',
    ],
    [
      'setting a due date',
      { kind: 'due_date', newValue: '2999-12-25' },
      'Ada Lovelace puso a «A task» vencimiento el 25 dic 2999',
    ],
    [
      'changing a due date',
      { kind: 'due_date', oldValue: '2999-12-24', newValue: '2999-12-25' },
      'Ada Lovelace puso a «A task» vencimiento el 25 dic 2999',
    ],
    [
      'removing a due date',
      { kind: 'due_date', oldValue: '2999-12-25' },
      'Ada Lovelace quitó el vencimiento de «A task»',
    ],
    ['deleting', { kind: 'deleted' }, 'Ada Lovelace borró «A task»'],
  ])(
    'says who, which task and what changed when %s',
    async (_, overrides, text) => {
      vi.mocked(startVisit).mockResolvedValue([change(overrides)])

      renderList()

      const summary = await screen.findByRole('region', { name: SUMMARY })
      expect(within(summary).getByText(text)).toBeInTheDocument()
    },
  )

  it('shows one entry per change', async () => {
    vi.mocked(startVisit).mockResolvedValue([
      change({ id: 1 }),
      change({ id: 2, kind: 'taken' }),
      change({ id: 3, kind: 'deleted' }),
    ])

    renderList()

    const summary = await screen.findByRole('region', { name: SUMMARY })
    expect(within(summary).getAllByRole('listitem')).toHaveLength(3)
  })

  it('falls back to initials, and then to someone, for who made the change', async () => {
    vi.mocked(startVisit).mockResolvedValue([
      change({ id: 1, actor: { ...ada, fullName: null } }),
      change({ id: 2, actor: null }),
    ])

    renderList()

    expect(await screen.findByText('AL creó «A task»')).toBeInTheDocument()
    expect(screen.getByText('Alguien creó «A task»')).toBeInTheDocument()
  })

  it('goes above the list, apart from it', async () => {
    vi.mocked(getTasks).mockResolvedValue([
      {
        id: 1,
        title: 'Listed task',
        status: 'pending',
        assignee: null,
        dueDate: null,
        createdAt: '2026-11-01T10:00:00.000+00:00',
        updatedAt: null,
      },
    ])
    vi.mocked(startVisit).mockResolvedValue([change({})])

    renderList()

    const summary = await screen.findByRole('region', { name: SUMMARY })
    const listed = await screen.findByText('Listed task')
    expect(summary).not.toContainElement(listed)
    expect(
      summary.compareDocumentPosition(listed) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('shows no summary when nothing changed, which includes a first visit', async () => {
    renderList()

    await screen.findByText('Todavía no hay tareas.')
    await waitFor(() => expect(startVisit).toHaveBeenCalled())

    expect(screen.queryByRole('region', { name: SUMMARY })).toBeNull()
  })

  it('counts as one visit under StrictMode, keeping what it returned', async () => {
    vi.mocked(startVisit)
      .mockResolvedValueOnce([change({})])
      .mockResolvedValue([])

    render(
      <StrictMode>
        <AuthContext.Provider value={auth()}>
          <MemoryRouter initialEntries={['/tasks']}>
            <AppRoutes />
          </MemoryRouter>
        </AuthContext.Provider>
      </StrictMode>,
    )

    expect(
      await screen.findByRole('region', { name: SUMMARY }),
    ).toBeInTheDocument()
    expect(startVisit).toHaveBeenCalledTimes(1)
    expect(startVisit).toHaveBeenCalledWith('a-token')
  })

  it('going to the profile and back is the same visit, so the summary stays', async () => {
    vi.mocked(startVisit)
      .mockResolvedValueOnce([change({})])
      .mockResolvedValue([])
    const user = userEvent.setup()
    renderList()
    await screen.findByRole('region', { name: SUMMARY })

    await user.click(screen.getByRole('link', { name: 'Perfil' }))
    expect(screen.queryByRole('region', { name: SUMMARY })).toBeNull()
    const links = screen.getAllByRole('link')
    const backToTasks = links.find(
      (link) => link.getAttribute('href') === '/tasks',
    )
    await user.click(backToTasks as HTMLElement)

    expect(
      await screen.findByRole('region', { name: SUMMARY }),
    ).toBeInTheDocument()
    expect(startVisit).toHaveBeenCalledTimes(1)
  })

  it('a new session is a new visit', async () => {
    const { unmount } = renderList()
    await waitFor(() => expect(startVisit).toHaveBeenCalledWith('a-token'))
    unmount()

    vi.mocked(startVisit).mockResolvedValue([change({})])
    renderList({ ...auth(), token: 'another-token' })

    expect(
      await screen.findByRole('region', { name: SUMMARY }),
    ).toBeInTheDocument()
    expect(startVisit).toHaveBeenCalledTimes(2)
    expect(startVisit).toHaveBeenLastCalledWith('another-token')
  })

  it('tries again on coming back if the visit failed', async () => {
    vi.mocked(startVisit).mockRejectedValueOnce(new ApiError('Sin red.', 0))
    const { unmount } = renderList()
    await screen.findByText('Todavía no hay tareas.')
    await waitFor(() => expect(startVisit).toHaveBeenCalledTimes(1))
    await vi.waitFor(async () => {
      await Promise.resolve()
    })
    unmount()

    vi.mocked(startVisit).mockResolvedValue([change({})])
    renderList()

    expect(
      await screen.findByRole('region', { name: SUMMARY }),
    ).toBeInTheDocument()
    expect(startVisit).toHaveBeenCalledTimes(2)
  })

  it('keeps the list working if the visit fails', async () => {
    vi.mocked(startVisit).mockRejectedValue(new ApiError('Sin conexión.', 0))

    renderList()

    expect(
      await screen.findByText('Todavía no hay tareas.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: SUMMARY })).toBeNull()
  })

  it('closes the session if the visit gets a 401', async () => {
    vi.mocked(startVisit).mockRejectedValue(new ApiError('Caducada.', 401))
    const value = auth()

    renderList(value)

    await waitFor(() => expect(value.logout).toHaveBeenCalled())
  })

  it('shows no presence: no time and nothing about who is online', async () => {
    vi.mocked(startVisit).mockResolvedValue([change({})])

    renderList()

    const summary = await screen.findByRole('region', { name: SUMMARY })
    expect(summary).not.toHaveTextContent(/conectad|en línea|online|activ/i)
    expect(summary).not.toHaveTextContent(/hace |\d{1,2}:\d{2}/)
  })
})
