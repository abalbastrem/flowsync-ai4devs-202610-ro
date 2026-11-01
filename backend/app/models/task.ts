import User from '#models/user'
import { TaskSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export const TASK_STATUSES = ['pending', 'in_progress', 'done'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export default class Task extends TaskSchema {
  declare status: TaskStatus

  @belongsTo(() => User, { foreignKey: 'assigneeId' })
  declare assignee: BelongsTo<typeof User>

  /**
   * A task has an assignee only while it is in progress: whoever puts it in
   * progress becomes the assignee, and any other status clears it.
   */
  changeStatus(status: TaskStatus, actor: User) {
    this.status = status
    this.assigneeId = status === 'in_progress' ? actor.id : null
  }
}
