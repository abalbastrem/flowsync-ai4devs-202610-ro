import type Task from '#models/task'
import { BaseTransformer } from '@adonisjs/core/transformers'
import AssigneeTransformer from '#transformers/assignee_transformer'

export default class TaskTransformer extends BaseTransformer<Task> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'status', 'dueDate', 'createdAt', 'updatedAt']),
      assignee: AssigneeTransformer.transform(this.whenLoaded(this.resource.assignee)),
    }
  }
}
