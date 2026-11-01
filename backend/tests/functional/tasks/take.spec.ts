import Task from '#models/task'
import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('Tasks: take', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('sets a task in progress with the current user as its assignee', async ({ client }) => {
    const user = await User.create({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'password123',
    })
    const task = await Task.create({ title: 'Free task', status: 'pending' })

    const response = await client.post(`/api/v1/tasks/${task.id}/take`).loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        id: task.id,
        status: 'in_progress',
        assignee: { id: user.id, fullName: 'Ada Lovelace' },
      },
    })
  })

  // The product has no locks: the confirmation (FLOW-10) lives in the UI, not here.
  test('takes over a task in progress with someone else', async ({ client }) => {
    const owner = await User.create({ email: 'owner@example.com', password: 'password123' })
    const user = await User.create({ email: 'ada@example.com', password: 'password123' })
    const task = await Task.create({
      title: 'Taken task',
      status: 'in_progress',
      assigneeId: owner.id,
    })

    const response = await client.post(`/api/v1/tasks/${task.id}/take`).loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({ data: { status: 'in_progress', assignee: { id: user.id } } })
  })

  test('requires a logged-in session', async ({ client }) => {
    const task = await Task.create({ title: 'Free task', status: 'pending' })

    const response = await client.post(`/api/v1/tasks/${task.id}/take`)

    response.assertStatus(401)
  })

  test('returns 404 for a task that does not exist', async ({ client }) => {
    const user = await User.create({ email: 'ada@example.com', password: 'password123' })

    const response = await client.post('/api/v1/tasks/999999/take').loginAs(user)

    response.assertStatus(404)
  })
})
