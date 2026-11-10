import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Task from '#models/task'

test.group('Tareas: crear con solo el título', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('con sesión y solo un título, responde 201 con la tarea creada', async ({
    client,
    assert,
  }) => {
    const user = await User.create({
      fullName: 'Ana García',
      email: 'ana@example.com',
      password: 'secret-password',
    })

    const response = await client
      .post('/api/v1/tasks')
      .json({ title: 'Preparar la demo' })
      .loginAs(user)

    response.assertStatus(201)
    assert.equal(response.body().data.title, 'Preparar la demo')
    assert.lengthOf(await Task.all(), 1)
  })

  test('sin sesión, responde 401 y no crea ninguna tarea', async ({ client, assert }) => {
    const response = await client.post('/api/v1/tasks').json({ title: 'Preparar la demo' })

    response.assertStatus(401)
    assert.lengthOf(await Task.all(), 0)
  })
})
