import type Task from '#models/task'
import { BaseTransformer } from '@adonisjs/core/transformers'
import AssigneeTransformer from '#transformers/assignee_transformer'

export default class TaskTransformer extends BaseTransformer<Task> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'status', 'createdAt', 'updatedAt']),
      // A due date is a day with no time (FR-5): with one, a time zone could move it.
      dueDate: this.resource.dueDate?.toISODate() ?? null,
      assignee: AssigneeTransformer.transform(this.whenLoaded(this.resource.assignee)),
    }
  }
}
