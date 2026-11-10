import type Task from '#models/task'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * Of the assignee only what the list needs to identify them is exposed:
 * never the email nor the rest of the account.
 */
export default class TaskTransformer extends BaseTransformer<Task> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'status']),
      assignee: this.pick(this.resource.assignee, ['id', 'fullName', 'initials']),
    }
  }
}
