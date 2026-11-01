import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AlertCircleIcon } from 'lucide-react'
import { useAuth } from '@/auth/use-auth'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { ApiError, getTasks } from '@/lib/api'
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

export function TasksPage() {
  const { token } = useAuth()
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="bg-muted/40 min-h-svh p-6">
      <div className="mx-auto grid w-full max-w-3xl gap-6">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">FlowSync</h1>
          <Link to="/profile" className="text-sm underline underline-offset-4">
            Perfil
          </Link>
        </header>

        {error && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

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
