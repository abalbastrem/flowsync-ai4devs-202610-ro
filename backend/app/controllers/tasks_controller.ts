import Task from '#models/task'
import TaskChange, { snapshotOf, type TaskSnapshot } from '#models/task_change'
import type User from '#models/user'
import { createTaskValidator, updateTaskValidator } from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import TaskTransformer from '#transformers/task_transformer'
import db from '@adonisjs/lucid/services/db'

export default class TasksController {
  async index({ serialize }: HttpContext) {
    const tasks = await Task.query().preload('assignee').orderBy('id')

    return serialize(TaskTransformer.transform(tasks))
  }

  async store({ auth, request, serialize }: HttpContext) {
    const { title } = await request.validateUsing(createTaskValidator)
    const actor = auth.getUserOrFail()

    const task = await db.transaction(async (trx) => {
      const created = await Task.create({ title }, { client: trx })
      await TaskChange.create(
        { actorId: actor.id, taskTitle: title, kind: 'created' },
        { client: trx }
      )
      return created
    })
    await task.refresh()
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task))
  }

  async take({ auth, params, serialize }: HttpContext) {
    const task = await Task.findOrFail(params.id)
    const actor = auth.getUserOrFail()
    const before = snapshotOf(task)

    task.changeStatus('in_progress', actor)
    await this.saveWithChanges(task, before, actor)
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task))
  }

  async destroy({ auth, params, response }: HttpContext) {
    const task = await Task.findOrFail(params.id)
    const actor = auth.getUserOrFail()

    await db.transaction(async (trx) => {
      task.useTransaction(trx)
      await task.delete()
      await TaskChange.create(
        { actorId: actor.id, taskTitle: task.title, kind: 'deleted' },
        { client: trx }
      )
    })

    return response.noContent()
  }

  async update({ auth, params, request, serialize }: HttpContext) {
    const { title, status, dueDate } = await request.validateUsing(updateTaskValidator)
    const task = await Task.findOrFail(params.id)
    const actor = auth.getUserOrFail()
    const before = snapshotOf(task)

    if (title !== undefined) task.title = title
    if (dueDate !== undefined) task.dueDate = dueDate
    if (status !== undefined) task.changeStatus(status, actor)
    await this.saveWithChanges(task, before, actor)
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task))
  }

  /**
   * A change and its record are saved together, or neither is.
   */
  private saveWithChanges(task: Task, before: TaskSnapshot, actor: User) {
    return db.transaction(async (trx) => {
      task.useTransaction(trx)
      await task.save()
      await TaskChange.createMany(TaskChange.between(before, task, actor), { client: trx })
    })
  }
}
