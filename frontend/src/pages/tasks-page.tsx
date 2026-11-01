import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AlertCircleIcon, PencilIcon } from 'lucide-react'
import { useAuth } from '@/auth/use-auth'
import { useAuthForm } from '@/auth/use-auth-form'
import { FieldError } from '@/components/field-error'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ApiError,
  createTask,
  getTasks,
  takeTask,
  updateTaskStatus,
  updateTaskTitle,
} from '@/lib/api'
import type { Task, TaskStatus } from '@/lib/types'

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Hecha',
}

const TASK_STATUSES = Object.keys(STATUS_LABELS) as TaskStatus[]

type StatusFilter = TaskStatus | 'all'

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  ...TASK_STATUSES.map((status) => ({
    value: status,
    label: STATUS_LABELS[status],
  })),
]

// La fecha de vencimiento es un día sin hora: formatearla en la zona del
// navegador podría moverla al día anterior.
const dueDateFormatter = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'medium',
  timeZone: 'UTC',
})

const FIELDS = ['title'] as const

/** Una tarea hecha tampoco tiene responsable, pero no está disponible para nadie. */
function assigneeLabel(task: Task) {
  if (task.assignee) return task.assignee.fullName ?? task.assignee.initials

  return task.status === 'done' ? '—' : 'Libre'
}

/** Con un token caducado no se puede hacer nada aquí: `ProtectedRoute` manda a /login. */
function closeExpiredSession(cause: unknown, logout: () => Promise<void>) {
  if (cause instanceof ApiError && cause.status === 401) void logout()
}

export function TasksPage() {
  const { token, user, logout } = useAuth()
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [editing, setEditing] = useState<{
    id: number
    title: string
    error: string | null
  } | null>(null)
  const [pendingChange, setPendingChange] = useState<{
    holder: string
    apply: () => void
  } | null>(null)
  const { isSubmitting, formError, fieldErrors, submit, failWith } =
    useAuthForm(FIELDS)

  useEffect(() => {
    // `ProtectedRoute` garantiza que aquí ya hay sesión resuelta.
    if (!token) return

    let isCurrent = true
    getTasks(token)
      .then((result) => {
        if (isCurrent) setTasks(result)
      })
      .catch((cause: unknown) => {
        if (isCurrent) {
          closeExpiredSession(cause, logout)
          setError(
            cause instanceof ApiError
              ? cause.message
              : 'Algo ha ido mal. Inténtalo de nuevo.',
          )
        }
      })

    return () => {
      isCurrent = false
    }
  }, [token, logout])

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault()

    if (!token) return
    if (!title.trim()) return failWith('title', 'Escribe un título.')

    return submit(async () => {
      try {
        const task = await createTask(token, title)
        setTasks((current) => [...(current ?? []), task])
        setTitle('')
        // Con un filtro que no la muestra, parecería no haberse creado.
        if (filter !== task.status) setFilter('all')
      } catch (cause) {
        closeExpiredSession(cause, logout)
        throw cause
      }
    })
  }

  const updateTask = async (
    id: number,
    change: (token: string) => Promise<Task>,
  ) => {
    if (!token) return false

    setError(null)
    setIsUpdating(true)
    try {
      const updated = await change(token)
      setTasks((current) =>
        (current ?? []).map((task) => (task.id === id ? updated : task)),
      )
      return true
    } catch (cause) {
      closeExpiredSession(cause, logout)
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Algo ha ido mal. Inténtalo de nuevo.',
      )
      return false
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSaveTitle = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!editing) return
    if (!editing.title.trim()) {
      setEditing({ ...editing, error: 'Escribe un título.' })
      return
    }

    const { id, title: newTitle } = editing
    const saved = await updateTask(id, (token) =>
      updateTaskTitle(token, id, newTitle),
    )
    // Si falla, la fila sigue en edición para no perder lo escrito.
    if (saved) setEditing(null)
  }

  const isSomeoneElses = (task: Task) =>
    task.status === 'in_progress' &&
    task.assignee !== null &&
    task.assignee.id !== user?.id

  /** Cambiar una tarea en curso de otra persona pide confirmación antes (FR-3). */
  const requestChange = (
    task: Task,
    change: (token: string) => Promise<Task>,
  ) => {
    const apply = () => void updateTask(task.id, change)

    if (isSomeoneElses(task)) {
      setPendingChange({ holder: assigneeLabel(task), apply })
    } else {
      apply()
    }
  }

  const alertMessage = formError ?? error
  const visibleTasks = (tasks ?? []).filter(
    (task) => filter === 'all' || task.status === filter,
  )

  return (
    <div className="bg-muted/40 min-h-svh p-6">
      <div className="mx-auto grid w-full max-w-3xl gap-6">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">FlowSync</h1>
          <Link to="/profile" className="text-sm underline underline-offset-4">
            Perfil
          </Link>
        </header>

        {alertMessage && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{alertMessage}</AlertDescription>
          </Alert>
        )}

        {!tasks && !error && (
          <p className="text-muted-foreground text-sm">Cargando tareas…</p>
        )}

        {/* Sin la lista cargada, una tarea nueva parecería ser la única que hay. */}
        {tasks && (
          <form onSubmit={handleCreate} className="grid gap-2" noValidate>
            <Label htmlFor="title">Nueva tarea</Label>
            <div className="flex gap-2">
              <Input
                id="title"
                name="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                aria-invalid={Boolean(fieldErrors.title)}
                aria-describedby={fieldErrors.title ? 'title-error' : undefined}
              />
              <Button type="submit" disabled={isSubmitting}>
                Crear
              </Button>
            </div>
            <FieldError id="title-error" message={fieldErrors.title} />
          </form>
        )}

        {tasks && (
          <div
            role="group"
            aria-label="Filtrar por estado"
            className="flex flex-wrap gap-2"
          >
            {FILTERS.map(({ value, label }) => (
              <Button
                key={value}
                variant={filter === value ? 'default' : 'outline'}
                size="sm"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        )}

        {tasks && (
          <Card>
            <CardContent>
              {visibleTasks.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  {tasks.length === 0
                    ? 'Todavía no hay tareas.'
                    : 'No hay tareas con este estado.'}
                </p>
              )}
              <ul className="divide-y">
                {visibleTasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm"
                  >
                    {editing?.id === task.id ? (
                      <form
                        onSubmit={handleSaveTitle}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') setEditing(null)
                        }}
                        className="grid min-w-0 flex-1 basis-full gap-1"
                        noValidate
                      >
                        <div className="flex flex-wrap gap-2">
                          <Input
                            aria-label={`Título de ${task.title}`}
                            className="h-8 min-w-40 flex-1"
                            value={editing.title}
                            autoFocus
                            aria-invalid={Boolean(editing.error)}
                            aria-describedby={
                              editing.error ? 'edit-title-error' : undefined
                            }
                            onChange={(event) =>
                              setEditing({
                                ...editing,
                                title: event.target.value,
                                error: null,
                              })
                            }
                          />
                          <Button type="submit" size="sm" disabled={isUpdating}>
                            Guardar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditing(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                        <FieldError
                          id="edit-title-error"
                          message={editing.error ?? undefined}
                        />
                      </form>
                    ) : (
                      <span className="flex min-w-0 flex-1 items-center gap-1 font-medium">
                        <span className="min-w-0 break-words">
                          {task.title}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0"
                          aria-label={`Editar ${task.title}`}
                          onClick={() =>
                            setEditing({
                              id: task.id,
                              title: task.title,
                              error: null,
                            })
                          }
                        >
                          <PencilIcon />
                        </Button>
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      {assigneeLabel(task)}
                    </span>
                    <select
                      aria-label={`Estado de ${task.title}`}
                      className="border-input bg-background h-8 rounded-md border px-2 text-sm disabled:opacity-50"
                      value={task.status}
                      disabled={isUpdating}
                      onChange={(event) => {
                        // Al esperar la confirmación, React ya habrá devuelto
                        // el selector al estado anterior: hay que leerlo ahora.
                        const status = event.target.value as TaskStatus
                        requestChange(task, (token) =>
                          updateTaskStatus(token, task.id, status),
                        )
                      }}
                    >
                      {TASK_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                    {task.dueDate && (
                      <span className="text-muted-foreground">
                        {dueDateFormatter.format(new Date(task.dueDate))}
                      </span>
                    )}
                    {(task.status === 'pending' || isSomeoneElses(task)) && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isUpdating}
                        onClick={() =>
                          requestChange(task, (token) =>
                            takeTask(token, task.id),
                          )
                        }
                      >
                        Take
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {pendingChange && (
          <AlertDialog
            open
            onOpenChange={(open) => {
              if (!open) setPendingChange(null)
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  ¿Cambiar una tarea de otra persona?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {pendingChange.holder} tiene esta tarea en curso.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={pendingChange.apply}>
                  Continuar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}
