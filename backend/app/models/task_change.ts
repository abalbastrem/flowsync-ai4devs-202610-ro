import { TaskChangeSchema } from '#database/schema'
import type Task from '#models/task'
import User from '#models/user'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export type TaskChangeKind = 'created' | 'title' | 'taken' | 'status' | 'due_date' | 'deleted'

/**
 * The fields of a task whose changes are recorded, as they were before a change.
 */
export type TaskSnapshot = Pick<Task, 'title' | 'status' | 'assigneeId'> & {
  dueDate: string | null
}

export function snapshotOf(task: Task): TaskSnapshot {
  return {
    title: task.title,
    status: task.status,
    assigneeId: task.assigneeId,
    dueDate: task.dueDate?.toISODate() ?? null,
  }
}

export default class TaskChange extends TaskChangeSchema {
  declare kind: TaskChangeKind

  @belongsTo(() => User, { foreignKey: 'actorId' })
  declare actor: BelongsTo<typeof User>

  /**
   * One change per field that really differs from what it was before.
   */
  static between(before: TaskSnapshot, task: Task, actor: User) {
    const after = snapshotOf(task)
    const changes: Partial<TaskChange>[] = []
    const add = (
      kind: TaskChangeKind,
      oldValue: string | null = null,
      newValue: string | null = null
    ) => changes.push({ actorId: actor.id, taskTitle: task.title, kind, oldValue, newValue })

    if (after.title !== before.title) add('title', before.title, after.title)

    if (after.assigneeId === actor.id && before.assigneeId !== actor.id) {
      add('taken')
    } else if (after.status !== before.status) {
      add('status', before.status, after.status)
    }

    if (after.dueDate !== before.dueDate) add('due_date', before.dueDate, after.dueDate)

    return changes
  }
}
