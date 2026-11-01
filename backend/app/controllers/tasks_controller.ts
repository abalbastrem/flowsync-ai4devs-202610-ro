import Task from '#models/task'
import { createTaskValidator } from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import TaskTransformer from '#transformers/task_transformer'

export default class TasksController {
  async store({ request, serialize }: HttpContext) {
    const { title } = await request.validateUsing(createTaskValidator)

    const task = await Task.create({ title })
    await task.refresh()

    return serialize(TaskTransformer.transform(task))
  }
}
