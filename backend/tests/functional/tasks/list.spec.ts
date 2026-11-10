import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Task from '#models/task'

async function seedTeam() {
  const ana = await User.create({
    fullName: 'Ana García',
    email: 'ana@example.com',
    password: 'secret-password',
  })
  const bruno = await User.create({
    fullName: 'Bruno Díaz',
    email: 'bruno@example.com',
    password: 'secret-password',
  })
  await Task.create({ title: 'Tarea de Ana', assigneeId: ana.id, status: 'pending' })
  await Task.create({ title: 'Tarea de Bruno', assigneeId: bruno.id, status: 'in_progress' })
  return { ana, bruno }
}

const titles = (body: any) => (body.data as { title: string }[]).map((task) => task.title).sort()

test.group('Lista: la misma para todos los miembros', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('dos personas distintas reciben exactamente el mismo conjunto de tareas', async ({
    client,
    assert,
  }) => {
    const { ana, bruno } = await seedTeam()

    const asAna = await client.get('/api/v1/tasks').loginAs(ana)
    const asBruno = await client.get('/api/v1/tasks').loginAs(bruno)

    asAna.assertStatus(200)
    asBruno.assertStatus(200)
    assert.deepEqual(titles(asAna.body()), titles(asBruno.body()))
    assert.lengthOf(asAna.body().data, 2)
  })

  test('la tarea de la que otra persona es responsable aparece en mi lista', async ({
    client,
    assert,
  }) => {
    const { ana } = await seedTeam()

    const response = await client.get('/api/v1/tasks').loginAs(ana)

    response.assertStatus(200)
    assert.include(titles(response.body()), 'Tarea de Bruno')
  })
})

test.group('Lista: exige haber iniciado sesión', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('sin credenciales responde 401 y el cuerpo no contiene tareas', async ({
    client,
    assert,
  }) => {
    await seedTeam()

    const response = await client.get('/api/v1/tasks')

    response.assertStatus(401)
    assert.notProperty(response.body(), 'data')
  })
})
