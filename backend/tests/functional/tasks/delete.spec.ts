import Task from '#models/task'
import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('Tasks: delete', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const createUser = (email = 'ada@example.com') => User.create({ email, password: 'password123' })

  test('removes the task', async ({ client, assert }) => {
    const user = await createUser()
    const task = await Task.create({ title: 'A task', status: 'pending' })

    const response = await client.delete(`/api/v1/tasks/${task.id}`).loginAs(user)

    response.assertStatus(204)
    assert.isNull(await Task.find(task.id))
  })

  test('removes a task in progress with someone else', async ({ client, assert }) => {
    const owner = await createUser('owner@example.com')
    const user = await createUser()
    const task = await Task.create({
      title: 'A task',
      status: 'in_progress',
      assigneeId: owner.id,
    })

    const response = await client.delete(`/api/v1/tasks/${task.id}`).loginAs(user)

    response.assertStatus(204)
    assert.isNull(await Task.find(task.id))
  })

  test('requires a logged-in session and keeps the task', async ({ client, assert }) => {
    const task = await Task.create({ title: 'A task', status: 'pending' })

    const response = await client.delete(`/api/v1/tasks/${task.id}`)

    response.assertStatus(401)
    assert.isNotNull(await Task.find(task.id))
  })

  test('returns 404 for a task that does not exist', async ({ client }) => {
    const user = await createUser()

    const response = await client.delete('/api/v1/tasks/999999').loginAs(user)

    response.assertStatus(404)
  })
})
