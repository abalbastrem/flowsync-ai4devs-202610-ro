import { useEffect, useState } from 'react'
import { AlertCircleIcon } from 'lucide-react'
import { useAuth } from '@/auth/use-auth'
import * as api from '@/lib/api'
import { ApiError } from '@/lib/api'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TaskRow } from '@/components/task-row'
import type { Task } from '@/lib/types'

/**
 * La lista compartida del equipo: una sola vista, la misma para todos.
 */
export function TasksPage() {
  const { token } = useAuth()
  const [title, setTitle] = useState('')
  const [isCreating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[] | null>(null)

  useEffect(() => {
    if (!token) return

    let cancelled = false
    api
      .listTasks(token)
      .then((loaded) => {
        if (!cancelled) setTasks(loaded)
      })
      .catch((caught: unknown) => {
        if (cancelled) return
        setError(
          caught instanceof ApiError
            ? caught.message
            : 'No se ha podido cargar la lista.',
        )
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!token) return

    setCreating(true)
    setError(null)
    try {
      const created = await api.createTask(token, title)
      // La más reciente va primero, igual que la ordena el servidor.
      setTasks((current) => [created, ...(current ?? [])])
      setTitle('')
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'No se ha podido crear la tarea.',
      )
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className="bg-muted/40 min-h-svh p-6">
      <div className="mx-auto grid w-full max-w-2xl gap-6">
        <h1 className="text-2xl font-semibold">Tareas del equipo</h1>

        <form
          aria-label="Nueva tarea"
          onSubmit={handleSubmit}
          className="flex items-end gap-2"
          noValidate
        >
          <div className="grid flex-1 gap-2">
            <Label htmlFor="task-title">Título</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoComplete="off"
            />
          </div>
          <Button type="submit" disabled={isCreating}>
            Crear tarea
          </Button>
        </form>

        {error && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {tasks?.length === 0 && (
          <div className="bg-background rounded-md border border-dashed p-6 text-center">
            <p className="font-medium">
              Aquí verás en qué anda cada persona del equipo y qué queda libre.
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Todavía no hay ninguna tarea: crea la primera escribiendo su
              título arriba.
            </p>
          </div>
        )}

        {tasks && tasks.length > 0 && (
          <ul aria-label="Tareas" className="grid gap-2">
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
