import { STATUS_LABELS } from '@/lib/task-status'
import type { Task } from '@/lib/types'

/** Una fila de la lista: título, responsable y estado, sin abrir nada. */
export function TaskRow({ task }: { task: Task }) {
  return (
    <li className="bg-background flex items-center gap-4 rounded-md border px-4 py-3">
      <span className="min-w-0 flex-1 truncate font-medium">{task.title}</span>
      <span className="text-muted-foreground text-sm">
        {task.assignee.fullName}
      </span>
      <span className="bg-muted rounded-full px-2 py-0.5 text-xs font-medium">
        {STATUS_LABELS[task.status]}
      </span>
    </li>
  )
}
