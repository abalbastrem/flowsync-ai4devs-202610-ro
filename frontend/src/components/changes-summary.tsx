import { Card, CardContent } from '@/components/ui/card'
import { formatDueDate, STATUS_LABELS } from '@/lib/task-labels'
import type { TaskChange, TaskStatus } from '@/lib/types'

function describe({ kind, taskTitle, oldValue, newValue, actor }: TaskChange) {
  const who = actor ? (actor.fullName ?? actor.initials) : 'Alguien'

  switch (kind) {
    case 'created':
      return `${who} creó «${taskTitle}»`
    case 'title':
      return `${who} renombró «${oldValue}» a «${newValue}»`
    case 'taken':
      return `${who} cogió «${taskTitle}»`
    case 'status':
      return `${who} pasó «${taskTitle}» a ${STATUS_LABELS[newValue as TaskStatus]}`
    case 'due_date':
      return newValue
        ? `${who} puso a «${taskTitle}» vencimiento el ${formatDueDate(newValue)}`
        : `${who} quitó el vencimiento de «${taskTitle}»`
    case 'deleted':
      return `${who} borró «${taskTitle}»`
  }
}

/** Lo que otros han cambiado desde la última visita (FR-8). */
export function ChangesSummary({ changes }: { changes: TaskChange[] }) {
  if (changes.length === 0) return null

  return (
    <section aria-labelledby="changes-summary-title">
      <Card>
        <CardContent className="grid gap-2">
          <h2 id="changes-summary-title" className="text-sm font-semibold">
            Cambios desde tu última visita
          </h2>
          <ul className="text-muted-foreground grid max-h-48 gap-1 overflow-y-auto text-sm">
            {changes.map((change) => (
              <li key={change.id}>{describe(change)}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  )
}
