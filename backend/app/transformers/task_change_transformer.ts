import type TaskChange from '#models/task_change'
import { BaseTransformer } from '@adonisjs/core/transformers'
import AssigneeTransformer from '#transformers/assignee_transformer'

export default class TaskChangeTransformer extends BaseTransformer<TaskChange> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'kind', 'taskTitle', 'oldValue', 'newValue', 'createdAt']),
      actor: AssigneeTransformer.transform(this.whenLoaded(this.resource.actor)),
    }
  }
}
