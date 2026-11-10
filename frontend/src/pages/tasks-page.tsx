import { useCallback, useEffect, useRef, useState } from 'react'
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
  const { token, logout } = useAuth()
  const [title, setTitle] = useState('')
  const [isCreating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[] | null>(null)
  // Solo cuenta la respuesta de la última carga pedida: una más antigua que
  // llegue tarde no puede pisar una lista más reciente.
  const latestLoad = useRef(0)

  // Un token que el backend ya no reconoce no sirve para nada: se cierra la
  // sesión y `ProtectedRoute` lleva al inicio de sesión.
  const isExpiredSession = useCallback(
    (caught: unknown) => {
      if (caught instanceof ApiError && caught.status === 401) {
        void logout()
        return true
      }
      return false
    },
    [logout],
  )

  const load = useCallback(() => {
    if (!token) return

    const id = ++latestLoad.current
    setLoadError(null)
    api
      .listTasks(token)
      .then((loaded) => {
        if (id === latestLoad.current) setTasks(loaded)
      })
      .catch((caught: unknown) => {
        if (id !== latestLoad.current || isExpiredSession(caught)) return
        setLoadError(
          caught instanceof ApiError
            ? caught.message
            : 'No se ha podido cargar la lista.',
        )
      })
  }, [token, isExpiredSession])

  useEffect(() => {
    const loads = latestLoad
    load()
    return () => {
      // Al desmontar o cambiar de token, ninguna carga en vuelo es la última.
      loads.current++
    }
  }, [load])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!token) return

    setCreating(true)
    setCreateError(null)
    try {
      const created = await api.createTask(token, title)
      setTitle('')
      if (tasks === null) {
        // La lista todavía no está (cargando o con error): insertar la nueva
        // la haría pasar por la lista completa. Se vuelve a pedir entera.
        load()
      } else {
        // La más reciente va primero, igual que la ordena el servidor.
        setTasks((current) => [created, ...(current ?? [])])
      }
    } catch (caught) {
      if (isExpiredSession(caught)) return
      setCreateError(
        caught instanceof ApiError
          ? caught.message
          : 'No se ha podido crear la tarea.',
      )
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className="bg-muted/40 min-h-[calc(100svh-3.5rem)] p-6">
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

        {createError && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{createError}</AlertDescription>
          </Alert>
        )}

        {loadError && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription className="flex items-center justify-between gap-4">
              {loadError}
              <Button type="button" variant="outline" size="sm" onClick={load}>
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {tasks === null && !loadError && (
          <p className="text-muted-foreground text-sm">Cargando la lista…</p>
        )}

        {tasks?.length === 0 && (
          <div className="bg-background rounded-md border border-dashed p-6 text-center">
            <p className="font-medium">
              Aquí verás en qué anda cada persona del equipo y qué queda libre.
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Todavía no hay ninguna: crea la primera tarea escribiendo su
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
