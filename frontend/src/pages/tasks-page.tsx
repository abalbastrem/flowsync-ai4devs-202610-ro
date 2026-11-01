import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AlertCircleIcon } from 'lucide-react'
import { useAuth } from '@/auth/use-auth'
import { useAuthForm } from '@/auth/use-auth-form'
import { FieldError } from '@/components/field-error'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
} from '@/lib/api'
import type { Task, TaskStatus } from '@/lib/types'

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Hecha',
}

const TASK_STATUSES = Object.keys(STATUS_LABELS) as TaskStatus[]

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
  const { token, logout } = useAuth()
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
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
    if (!token) return

    setError(null)
    setIsUpdating(true)
    try {
      const updated = await change(token)
      setTasks((current) =>
        (current ?? []).map((task) => (task.id === id ? updated : task)),
      )
    } catch (cause) {
      closeExpiredSession(cause, logout)
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Algo ha ido mal. Inténtalo de nuevo.',
      )
    } finally {
      setIsUpdating(false)
    }
  }

  const alertMessage = formError ?? error

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
          <Card>
            <CardContent>
              {tasks.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  Todavía no hay tareas.
                </p>
              )}
              <ul className="divide-y">
                {tasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm"
                  >
                    <span className="min-w-0 flex-1 font-medium">
                      {task.title}
                    </span>
                    <span className="text-muted-foreground">
                      {assigneeLabel(task)}
                    </span>
                    <select
                      aria-label={`Estado de ${task.title}`}
                      className="border-input bg-background h-8 rounded-md border px-2 text-sm disabled:opacity-50"
                      value={task.status}
                      disabled={isUpdating}
                      onChange={(event) =>
                        updateTask(task.id, (token) =>
                          updateTaskStatus(
                            token,
                            task.id,
                            event.target.value as TaskStatus,
                          ),
                        )
                      }
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
                    {task.status === 'pending' && !task.assignee && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isUpdating}
                        onClick={() =>
                          updateTask(task.id, (token) =>
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
      </div>
    </div>
  )
}
