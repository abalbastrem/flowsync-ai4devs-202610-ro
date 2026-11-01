import Task from '#models/task'
import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('Tasks: edit title', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const createUser = (email = 'ada@example.com') => User.create({ email, password: 'password123' })

  test('saves the new title, trimmed', async ({ client, assert }) => {
    const user = await createUser()
    const task = await Task.create({ title: 'Old title', status: 'pending' })

    const response = await client
      .patch(`/api/v1/tasks/${task.id}`)
      .json({ title: '  New title  ' })
      .loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({ data: { id: task.id, title: 'New title' } })

    await task.refresh()
    assert.equal(task.title, 'New title')
  })

  test('leaves the status and assignee of a task with someone else as they were', async ({
    client,
    assert,
  }) => {
    const owner = await createUser('owner@example.com')
    const user = await createUser()
    const task = await Task.create({
      title: 'Old title',
      status: 'in_progress',
      assigneeId: owner.id,
    })

    const response = await client
      .patch(`/api/v1/tasks/${task.id}`)
      .json({ title: 'New title' })
      .loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: { title: 'New title', status: 'in_progress', assignee: { id: owner.id } },
    })

    await task.refresh()
    assert.equal(task.status, 'in_progress')
    assert.equal(task.assigneeId, owner.id)
  })

  for (const [name, title] of [
    ['empty', ''],
    ['blank', '   '],
    ['null', null],
    ['too long', 'a'.repeat(256)],
  ] as const) {
    test(`rejects a title that is ${name} and does not save it`, async ({ client, assert }) => {
      const user = await createUser()
      const task = await Task.create({ title: 'Old title', status: 'pending' })

      const response = await client.patch(`/api/v1/tasks/${task.id}`).json({ title }).loginAs(user)

      response.assertStatus(422)

      await task.refresh()
      assert.equal(task.title, 'Old title')
    })
  }

  test('changing the status does not need a title', async ({ client, assert }) => {
    const user = await createUser()
    const task = await Task.create({ title: 'Old title', status: 'pending' })

    const response = await client
      .patch(`/api/v1/tasks/${task.id}`)
      .json({ status: 'done' })
      .loginAs(user)

    response.assertStatus(200)

    await task.refresh()
    assert.equal(task.title, 'Old title')
    assert.equal(task.status, 'done')
  })

  test('requires a logged-in session', async ({ client }) => {
    const task = await Task.create({ title: 'Old title', status: 'pending' })

    const response = await client.patch(`/api/v1/tasks/${task.id}`).json({ title: 'New title' })

    response.assertStatus(401)
  })

  test('returns 404 for a task that does not exist', async ({ client }) => {
    const user = await createUser()

    const response = await client
      .patch('/api/v1/tasks/999999')
      .json({ title: 'New title' })
      .loginAs(user)

    response.assertStatus(404)
  })
})
