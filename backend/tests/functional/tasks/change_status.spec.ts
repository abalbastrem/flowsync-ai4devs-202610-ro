import Task from '#models/task'
import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('Tasks: change status', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const createUser = (email = 'ada@example.com', fullName: string | null = null) =>
    User.create({ fullName, email, password: 'password123' })

  test('setting a task in progress makes me its assignee', async ({ client }) => {
    const user = await createUser('ada@example.com', 'Ada Lovelace')
    const task = await Task.create({ title: 'Free task', status: 'pending' })

    const response = await client
      .patch(`/api/v1/tasks/${task.id}`)
      .json({ status: 'in_progress' })
      .loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        id: task.id,
        status: 'in_progress',
        assignee: { id: user.id, fullName: 'Ada Lovelace' },
      },
    })
  })

  test('setting a task in progress with someone else makes me its assignee', async ({ client }) => {
    const owner = await createUser('owner@example.com')
    const user = await createUser()
    const task = await Task.create({
      title: 'Taken task',
      status: 'in_progress',
      assigneeId: owner.id,
    })

    const response = await client
      .patch(`/api/v1/tasks/${task.id}`)
      .json({ status: 'in_progress' })
      .loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({ data: { status: 'in_progress', assignee: { id: user.id } } })
  })

  for (const status of ['pending', 'done'] as const) {
    test(`setting a task in progress to ${status} clears its assignee`, async ({
      client,
      assert,
    }) => {
      const user = await createUser()
      const task = await Task.create({
        title: 'My task',
        status: 'in_progress',
        assigneeId: user.id,
      })

      const response = await client.patch(`/api/v1/tasks/${task.id}`).json({ status }).loginAs(user)

      response.assertStatus(200)
      response.assertBodyContains({ data: { status, assignee: null } })

      await task.refresh()
      assert.equal(task.status, status)
      assert.isNull(task.assigneeId)
    })
  }

  test('reopens a done task', async ({ client }) => {
    const user = await createUser()
    const task = await Task.create({ title: 'Done task', status: 'done' })

    const response = await client
      .patch(`/api/v1/tasks/${task.id}`)
      .json({ status: 'in_progress' })
      .loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({ data: { status: 'in_progress', assignee: { id: user.id } } })
  })

  test('rejects an invalid status and leaves the task unchanged', async ({ client, assert }) => {
    const user = await createUser()
    const task = await Task.create({ title: 'Free task', status: 'pending' })

    const response = await client
      .patch(`/api/v1/tasks/${task.id}`)
      .json({ status: 'archived' })
      .loginAs(user)

    response.assertStatus(422)

    await task.refresh()
    assert.equal(task.status, 'pending')
  })

  test('requires a logged-in session', async ({ client }) => {
    const task = await Task.create({ title: 'Free task', status: 'pending' })

    const response = await client.patch(`/api/v1/tasks/${task.id}`).json({ status: 'done' })

    response.assertStatus(401)
  })

  test('returns 404 for a task that does not exist', async ({ client }) => {
    const user = await createUser()

    const response = await client
      .patch('/api/v1/tasks/999999')
      .json({ status: 'done' })
      .loginAs(user)

    response.assertStatus(404)
  })
})
