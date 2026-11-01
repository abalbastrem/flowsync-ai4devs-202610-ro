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
import { ApiError, createTask, getTasks } from '@/lib/api'
import type { Task, TaskStatus } from '@/lib/types'

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Hecha',
}

// La fecha de vencimiento es un día sin hora: formatearla en la zona del
// navegador podría moverla al día anterior.
const dueDateFormatter = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'medium',
  timeZone: 'UTC',
})

const FIELDS = ['title'] as const

export function TasksPage() {
  const { token } = useAuth()
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
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
  }, [token])

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault()

    if (!title.trim()) return failWith('title', 'Escribe un título.')

    return submit(async () => {
      // `ProtectedRoute` garantiza que aquí ya hay sesión resuelta.
      const task = await createTask(token!, title)
      setTasks((current) => [...(current ?? []), task])
      setTitle('')
    })
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

        {tasks && (
          <Card>
            <CardContent>
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
                      {task.assignee
                        ? (task.assignee.fullName ?? task.assignee.initials)
                        : 'Libre'}
                    </span>
                    <span>{STATUS_LABELS[task.status]}</span>
                    {task.dueDate && (
                      <span className="text-muted-foreground">
                        {dueDateFormatter.format(new Date(task.dueDate))}
                      </span>
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
