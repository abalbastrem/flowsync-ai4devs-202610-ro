import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('Test database', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('does not use the development database file', async ({ assert }) => {
    const { filename } = db.getRawConnection('sqlite')!.config.connection as { filename: string }

    assert.include(filename, 'test.sqlite3')
  })

  // The email is unique: the second run only passes if the first one was rolled back.
  test('rolls back what a test writes')
    .with(['first run', 'second run'])
    .run(async ({ client }) => {
      const response = await client.post('/api/v1/auth/signup').json({
        fullName: null,
        email: 'tooling@example.com',
        password: 'password123',
        passwordConfirmation: 'password123',
      })

      response.assertStatus(200)
    })
})
