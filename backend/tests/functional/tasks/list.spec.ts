import Task from '#models/task'
import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('Tasks: list', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('shows any user the tasks created by others, with their fields', async ({ client }) => {
    const reader = await User.create({ email: 'reader@example.com', password: 'password123' })
    const assignee = await User.create({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'password123',
    })
    await Task.createMany([
      { title: 'Free task', status: 'pending' },
      { title: 'Taken task', status: 'in_progress', assigneeId: assignee.id },
    ])

    const response = await client.get('/api/v1/tasks').loginAs(reader)

    response.assertStatus(200)
    response.assertBodyContains({
      data: [
        { title: 'Free task', status: 'pending', assignee: null, dueDate: null },
        {
          title: 'Taken task',
          status: 'in_progress',
          assignee: { id: assignee.id, fullName: 'Ada Lovelace' },
          dueDate: null,
        },
      ],
    })
  })

  test('does not expose the email of the assignee', async ({ client, assert }) => {
    const reader = await User.create({ email: 'reader@example.com', password: 'password123' })
    const assignee = await User.create({ email: 'ada@example.com', password: 'password123' })
    await Task.create({ title: 'Taken task', status: 'in_progress', assigneeId: assignee.id })

    const response = await client.get('/api/v1/tasks').loginAs(reader)

    const { data } = response.body() as unknown as { data: { assignee: object }[] }
    assert.notProperty(data[0].assignee, 'email')
    assert.propertyVal(data[0].assignee, 'initials', 'AE')
  })

  test('requires a logged-in session', async ({ client }) => {
    const response = await client.get('/api/v1/tasks')

    response.assertStatus(401)
  })
})
