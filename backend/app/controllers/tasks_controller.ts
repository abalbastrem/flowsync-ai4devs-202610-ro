import Task from '#models/task'
import { createTaskValidator, updateTaskStatusValidator } from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import TaskTransformer from '#transformers/task_transformer'

export default class TasksController {
  async index({ serialize }: HttpContext) {
    const tasks = await Task.query().preload('assignee').orderBy('id')

    return serialize(TaskTransformer.transform(tasks))
  }

  async store({ request, serialize }: HttpContext) {
    const { title } = await request.validateUsing(createTaskValidator)

    const task = await Task.create({ title })
    await task.refresh()
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task))
  }

  async take({ auth, params, serialize }: HttpContext) {
    const task = await Task.findOrFail(params.id)

    task.changeStatus('in_progress', auth.getUserOrFail())
    await task.save()
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task))
  }

  async update({ auth, params, request, serialize }: HttpContext) {
    const { status } = await request.validateUsing(updateTaskStatusValidator)
    const task = await Task.findOrFail(params.id)

    task.changeStatus(status, auth.getUserOrFail())
    await task.save()
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task))
  }
}
