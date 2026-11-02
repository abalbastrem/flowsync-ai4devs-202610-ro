import Task from '#models/task'
import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import type { ApiClient } from '@japa/api-client'

type Change = {
  kind: string
  taskTitle: string
  oldValue: string | null
  newValue: string | null
  actor: { fullName: string | null; initials: string } | null
}

const visit = async (client: ApiClient, user: User) => {
  const response = await client.post('/api/v1/account/visits').loginAs(user)
  response.assertStatus(200)

  return (response.body() as unknown as { data: Change[] }).data
}

test.group('Account: visits', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const createUsers = async () => ({
    ada: await User.create({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'password123',
    }),
    grace: await User.create({
      fullName: 'Grace Hopper',
      email: 'grace@example.com',
      password: 'password123',
    }),
  })

  const summary = (changes: Change[]) =>
    changes.map(({ kind, taskTitle, oldValue, newValue }) => ({
      kind,
      taskTitle,
      oldValue,
      newValue,
    }))

  test('returns each kind of change by others since the last visit, oldest first', async ({
    client,
    assert,
  }) => {
    const { ada, grace } = await createUsers()
    await visit(client, grace)

    const created = await client.post('/api/v1/tasks').json({ title: 'Task' }).loginAs(ada)
    const { id } = (created.body() as unknown as { data: { id: number } }).data
    const url = `/api/v1/tasks/${id}`
    await client.patch(url).json({ title: 'Renamed' }).loginAs(ada)
    await client.post(`${url}/take`).loginAs(ada)
    await client.patch(url).json({ status: 'done' }).loginAs(ada)
    await client.patch(url).json({ dueDate: '2999-12-25' }).loginAs(ada)
    await client.patch(url).json({ dueDate: null }).loginAs(ada)
    await client.delete(url).loginAs(ada)

    const changes = await visit(client, grace)

    assert.deepEqual(summary(changes), [
      { kind: 'created', taskTitle: 'Task', oldValue: null, newValue: null },
      { kind: 'title', taskTitle: 'Renamed', oldValue: 'Task', newValue: 'Renamed' },
      { kind: 'taken', taskTitle: 'Renamed', oldValue: null, newValue: null },
      { kind: 'status', taskTitle: 'Renamed', oldValue: 'in_progress', newValue: 'done' },
      { kind: 'due_date', taskTitle: 'Renamed', oldValue: null, newValue: '2999-12-25' },
      { kind: 'due_date', taskTitle: 'Renamed', oldValue: '2999-12-25', newValue: null },
      { kind: 'deleted', taskTitle: 'Renamed', oldValue: null, newValue: null },
    ])
    assert.equal(changes[0].actor?.fullName, 'Ada Lovelace')
  })

  test('records one change per field when a request changes several', async ({
    client,
    assert,
  }) => {
    const { ada, grace } = await createUsers()
    const task = await Task.create({ title: 'Task', status: 'pending' })
    await visit(client, grace)

    await client
      .patch(`/api/v1/tasks/${task.id}`)
      .json({ title: 'Renamed', dueDate: '2999-12-25' })
      .loginAs(ada)

    const changes = await visit(client, grace)
    assert.deepEqual(
      changes.map((change) => change.kind),
      ['title', 'due_date']
    )
  })

  test('taking a task from someone else counts as a change', async ({ client, assert }) => {
    const { ada, grace } = await createUsers()
    const task = await Task.create({
      title: 'Task',
      status: 'in_progress',
      assigneeId: grace.id,
    })
    await visit(client, grace)

    await client.post(`/api/v1/tasks/${task.id}/take`).loginAs(ada)

    const changes = await visit(client, grace)
    assert.deepEqual(
      changes.map((change) => change.kind),
      ['taken']
    )
  })

  test('records nothing when saving makes no real difference', async ({ client, assert }) => {
    const { ada, grace } = await createUsers()
    const task = await Task.create({ title: 'Task', status: 'pending' })
    await client.post(`/api/v1/tasks/${task.id}/take`).loginAs(ada)
    await visit(client, grace)

    const url = `/api/v1/tasks/${task.id}`
    await client.patch(url).json({ title: 'Task', dueDate: null }).loginAs(ada)
    await client.patch(url).json({ status: 'in_progress' }).loginAs(ada)
    await client.post(`${url}/take`).loginAs(ada)

    assert.deepEqual(await visit(client, grace), [])
  })

  test('does not return my own changes', async ({ client, assert }) => {
    const { ada, grace } = await createUsers()
    await visit(client, grace)

    await client.post('/api/v1/tasks').json({ title: 'Mine' }).loginAs(grace)
    await client.post('/api/v1/tasks').json({ title: 'Theirs' }).loginAs(ada)

    const changes = await visit(client, grace)
    assert.deepEqual(
      changes.map((change) => change.taskTitle),
      ['Theirs']
    )
  })

  test('returns nothing on the first visit, nor those changes on the next one', async ({
    client,
    assert,
  }) => {
    const { ada, grace } = await createUsers()
    await client.post('/api/v1/tasks').json({ title: 'Earlier' }).loginAs(ada)

    assert.deepEqual(await visit(client, grace), [])
    assert.deepEqual(await visit(client, grace), [])
  })

  test('starting a visit with no change recorded yet is not a first visit next time', async ({
    client,
    assert,
  }) => {
    const { ada, grace } = await createUsers()
    await visit(client, grace)

    await client.post('/api/v1/tasks').json({ title: 'Later' }).loginAs(ada)

    assert.lengthOf(await visit(client, grace), 1)
  })

  test('a second visit straight after returns nothing', async ({ client, assert }) => {
    const { ada, grace } = await createUsers()
    await visit(client, grace)
    await client.post('/api/v1/tasks').json({ title: 'Task' }).loginAs(ada)

    assert.lengthOf(await visit(client, grace), 1)
    assert.deepEqual(await visit(client, grace), [])
  })

  test('does not record anything when a change is rejected', async ({ client, assert }) => {
    const { ada, grace } = await createUsers()
    const task = await Task.create({ title: 'Task', status: 'pending' })
    await visit(client, grace)

    await client.patch(`/api/v1/tasks/${task.id}`).json({ title: '' }).loginAs(ada)

    assert.deepEqual(await visit(client, grace), [])
  })

  test('does not expose email addresses', async ({ client, assert }) => {
    const { ada, grace } = await createUsers()
    await visit(client, grace)
    await client.post('/api/v1/tasks').json({ title: 'Task' }).loginAs(ada)

    const [change] = await visit(client, grace)

    assert.notProperty(change.actor, 'email')
    assert.equal(change.actor?.initials, 'AL')
  })

  test('requires a logged-in session', async ({ client }) => {
    const response = await client.post('/api/v1/account/visits')

    response.assertStatus(401)
  })
})
