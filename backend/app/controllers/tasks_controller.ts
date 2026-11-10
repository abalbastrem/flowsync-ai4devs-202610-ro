import Task from '#models/task'
import { createTaskValidator } from '#validators/task'
import TaskTransformer from '#transformers/task_transformer'
import type { HttpContext } from '@adonisjs/core/http'

export default class TasksController {
  async store({ auth, request, response, serialize }: HttpContext) {
    const { title } = await request.validateUsing(createTaskValidator)
    const user = auth.getUserOrFail()

    const task = await Task.create({ title, assigneeId: user.id, status: 'pending' })
    await task.load('assignee')

    response.status(201)
    return serialize(TaskTransformer.transform(task))
  }
}
