import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Task from '#models/task'

test.group('Tareas: crear con solo el título', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('SC-19 · con sesión y solo un título, responde 201 con la tarea creada', async ({
    client,
    assert,
  }) => {
    const user = await User.create({
      fullName: 'Ana García',
      email: 'ana@example.com',
      password: 'secret-password',
    })

    const response = await client
      .visit('tasks.tasks.store')
      .json({ title: 'Preparar la demo' })
      .loginAs(user)

    response.assertStatus(201)
    assert.equal(response.body().data.title, 'Preparar la demo')
    assert.lengthOf(await Task.all(), 1)
  })

  test('SC-20 · sin sesión, responde 401 y no crea ninguna tarea', async ({ client, assert }) => {
    const response = await client.visit('tasks.tasks.store').json({ title: 'Preparar la demo' })

    response.assertStatus(401)
    assert.lengthOf(await Task.all(), 0)
  })

  test('SC-29 · ignora el responsable y el estado enviados junto al título', async ({
    client,
    assert,
  }) => {
    const ana = await User.create({
      fullName: 'Ana García',
      email: 'ana@example.com',
      password: 'secret-password',
    })
    const luis = await User.create({
      fullName: 'Luis Pérez',
      email: 'luis@example.com',
      password: 'secret-password',
    })

    const created = await client
      .visit('tasks.tasks.store')
      .json({ title: 'Con campos de más', assigneeId: luis.id, status: 'done' } as {
        title: string
      })
      .loginAs(ana)
    const listed = await client.visit('tasks.tasks.index').loginAs(ana)

    created.assertStatus(201)
    assert.equal(created.body().data.assignee.id, ana.id)
    assert.equal(created.body().data.status, 'pending')
    assert.equal(listed.body().data[0].assignee.id, ana.id)
    assert.equal(listed.body().data[0].status, 'pending')
  })
})

test.group('Tareas: nacen mías y en «Pendiente»', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('SC-23 · la tarea creada tiene como responsable a quien la creó, también en la lista', async ({
    client,
    assert,
  }) => {
    const ana = await User.create({
      fullName: 'Ana García',
      email: 'ana@example.com',
      password: 'secret-password',
    })

    const created = await client.visit('tasks.tasks.store').json({ title: 'Mía' }).loginAs(ana)
    const listed = await client.visit('tasks.tasks.index').loginAs(ana)

    created.assertStatus(201)
    assert.equal(created.body().data.assignee.id, ana.id)
    assert.equal(created.body().data.assignee.fullName, 'Ana García')
    assert.equal(listed.body().data[0].assignee.id, ana.id)
  })

  test('SC-24 · la tarea creada nace en «Pendiente»', async ({ client, assert }) => {
    const ana = await User.create({
      fullName: 'Ana García',
      email: 'ana@example.com',
      password: 'secret-password',
    })

    const created = await client.visit('tasks.tasks.store').json({ title: 'Nueva' }).loginAs(ana)

    created.assertStatus(201)
    assert.equal(created.body().data.status, 'pending')
  })
})
