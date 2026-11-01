import User from '#models/user'
import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('Tasks: create', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const member = () => User.create({ email: 'member@example.com', password: 'password123' })

  test('creates a task from a title, pending, with no assignee and no due date', async ({
    client,
  }) => {
    const response = await client
      .post('/api/v1/tasks')
      .json({ title: 'Fix login' })
      .loginAs(await member())

    response.assertStatus(200)
    response.assertBodyContains({
      data: { title: 'Fix login', status: 'pending', assignee: null, dueDate: null },
    })
  })

  test('rejects a {label} title')
    .with([
      { title: '', label: 'empty' },
      { title: '   ', label: 'blank' },
    ])
    .run(async ({ client, assert }, { title }) => {
      const response = await client
        .post('/api/v1/tasks')
        .json({ title })
        .loginAs(await member())

      response.assertStatus(422)
      assert.lengthOf(await db.from('tasks'), 0)
    })

  test('requires a logged-in session', async ({ client }) => {
    const response = await client.post('/api/v1/tasks').json({ title: 'Fix login' })

    response.assertStatus(401)
  })
})
