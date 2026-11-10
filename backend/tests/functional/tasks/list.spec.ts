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

test.group('Lista: cada tarea trae título, responsable y estado', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('cada tarea del cuerpo incluye título, estado y responsable', async ({ client, assert }) => {
    const { ana } = await seedTeam()

    const response = await client.get('/api/v1/tasks').loginAs(ana)

    response.assertStatus(200)
    for (const task of response.body().data) {
      assert.properties(task, ['title', 'status', 'assignee'])
      assert.oneOf(task.status, ['pending', 'in_progress', 'done'])
      assert.properties(task.assignee, ['fullName', 'initials'])
    }
  })
})

test.group('Lista: el responsable se identifica por su nombre', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('con un responsable sin nombre llegan sus iniciales, y nunca el email', async ({
    client,
    assert,
  }) => {
    const ana = await User.create({
      fullName: 'Ana García',
      email: 'ana@example.com',
      password: 'secret-password',
    })
    const anonymous = await User.create({
      fullName: null,
      email: 'xavi.soler@example.com',
      password: 'secret-password',
    })
    await Task.create({ title: 'Sin nombre', assigneeId: anonymous.id, status: 'pending' })

    const response = await client.get('/api/v1/tasks').loginAs(ana)

    response.assertStatus(200)
    const [task] = response.body().data
    assert.isNull(task.assignee.fullName)
    assert.equal(task.assignee.initials, anonymous.initials)
    assert.notInclude(JSON.stringify(response.body()), 'example.com')
  })
})
