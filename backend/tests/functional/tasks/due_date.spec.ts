import Task from '#models/task'
import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'

test.group('Tasks: due date', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const createUser = () => User.create({ email: 'ada@example.com', password: 'password123' })

  const createTask = (dueDate: string | null = null) =>
    Task.create({
      title: 'A task',
      status: 'pending',
      dueDate: dueDate ? DateTime.fromISO(dueDate) : null,
    })

  test('saves a date and returns that same day, also in the list', async ({ client }) => {
    const user = await createUser()
    const task = await createTask()

    const response = await client
      .patch(`/api/v1/tasks/${task.id}`)
      .json({ dueDate: '2026-12-25' })
      .loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({ data: { dueDate: '2026-12-25' } })

    const list = await client.get('/api/v1/tasks').loginAs(user)
    list.assertBodyContains({ data: [{ id: task.id, dueDate: '2026-12-25' }] })
  })

  test('replaces an existing date', async ({ client }) => {
    const user = await createUser()
    const task = await createTask('2026-12-25')

    const response = await client
      .patch(`/api/v1/tasks/${task.id}`)
      .json({ dueDate: '2027-01-02' })
      .loginAs(user)

    response.assertBodyContains({ data: { dueDate: '2027-01-02' } })
  })

  for (const [name, dueDate] of [
    ['null', null],
    ['an empty value', ''],
  ] as const) {
    test(`removes the date with ${name}`, async ({ client, assert }) => {
      const user = await createUser()
      const task = await createTask('2026-12-25')

      const response = await client
        .patch(`/api/v1/tasks/${task.id}`)
        .json({ dueDate })
        .loginAs(user)

      response.assertStatus(200)
      response.assertBodyContains({ data: { dueDate: null } })

      await task.refresh()
      assert.isNull(task.dueDate)
    })
  }

  test('saves a date in the past', async ({ client }) => {
    const user = await createUser()
    const task = await createTask()

    const response = await client
      .patch(`/api/v1/tasks/${task.id}`)
      .json({ dueDate: '2000-01-01' })
      .loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({ data: { dueDate: '2000-01-01' } })
  })

  for (const dueDate of ['not-a-date', '2026-13-45', '2026-02-30', '2026-12-25T10:00:00']) {
    test(`rejects ${dueDate} and leaves the task unchanged`, async ({ client, assert }) => {
      const user = await createUser()
      const task = await createTask('2026-12-25')

      const response = await client
        .patch(`/api/v1/tasks/${task.id}`)
        .json({ dueDate })
        .loginAs(user)

      response.assertStatus(422)

      await task.refresh()
      assert.equal(task.dueDate?.toISODate(), '2026-12-25')
    })
  }

  test('leaves the date as it was when it is not sent', async ({ client }) => {
    const user = await createUser()
    const task = await createTask('2026-12-25')

    const response = await client
      .patch(`/api/v1/tasks/${task.id}`)
      .json({ title: 'New title' })
      .loginAs(user)

    response.assertBodyContains({ data: { title: 'New title', dueDate: '2026-12-25' } })
  })
})
