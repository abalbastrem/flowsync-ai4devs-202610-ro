/* eslint-disable @unicorn/no-await-expression-member */
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import { spawn } from 'node:child_process'
import { test } from '@japa/runner'
import type { ApiClient, ApiResponse } from '@japa/api-client'

/**
 * Executable version of the API requirements in docs/spec-viva/abm.md: each group is a
 * Requirement and each test a Scenario, with the same titles. They describe what the
 * system does today, so a failure means the spec is wrong, not the code.
 */

type FieldError = {
  message: string
  rule?: string
  field?: string
  meta?: Record<string, unknown>
}

const SIGNUP = '/api/v1/auth/signup' as const
const LOGIN = '/api/v1/auth/login' as const
const PROFILE = '/api/v1/account/profile' as const
const LOGOUT = '/api/v1/account/logout' as const

const PASSWORD = 'password123'
const USER_KEYS = ['id', 'fullName', 'email', 'createdAt', 'updatedAt', 'initials']

const signupBody = (overrides: Record<string, unknown> = {}) => ({
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  password: PASSWORD,
  passwordConfirmation: PASSWORD,
  ...overrides,
})

const signup = (client: ApiClient, overrides: Record<string, unknown> = {}) =>
  client.request(SIGNUP, 'POST').json(signupBody(overrides))

const login = (client: ApiClient, email = 'ada@example.com', password = PASSWORD) =>
  client.request(LOGIN, 'POST').json({ email, password })

/** Creates an account through the API and returns its token. */
const tokenFor = async (client: ApiClient, overrides: Record<string, unknown> = {}) => {
  const response = await signup(client, overrides)
  response.assertStatus(200)
  return response.body().data.token as string
}

const profile = (client: ApiClient, token: string) =>
  client.request(PROFILE, 'GET').header('Authorization', `Bearer ${token}`)

const logout = (client: ApiClient, token: string) =>
  client.request(LOGOUT, 'POST').header('Authorization', `Bearer ${token}`)

const errorsOf = (response: ApiResponse) => response.body().errors as FieldError[]

const errorFor = (response: ApiResponse, field: string) =>
  errorsOf(response).find((error) => error.field === field)

test.group('Requirement: Registro de cuenta por API', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Registro correcto con nombre', async ({ client, assert }) => {
    const response = await signup(client)

    response.assertStatus(200)
    const { data } = response.body()
    assert.sameMembers(Object.keys(data), ['user', 'token'])
    assert.sameMembers(Object.keys(data.user), USER_KEYS)
    assert.equal(data.user.fullName, 'Ada Lovelace')
    assert.equal(data.user.email, 'ada@example.com')
    assert.isString(data.token)
    assert.isNotEmpty(data.token)
    assert.notInclude(JSON.stringify(response.body()), PASSWORD)
  })

  test('Registro correcto sin nombre', async ({ client, assert }) => {
    const response = await signup(client, { fullName: null })

    response.assertStatus(200)
    assert.isNull(response.body().data.user.fullName)
  })

  test('Token utilizable de inmediato', async ({ client, assert }) => {
    const token = await tokenFor(client)

    const response = await profile(client, token)

    response.assertStatus(200)
    assert.equal(response.body().data.email, 'ada@example.com')
  })
})

test.group('Requirement: Validación del registro por API', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Campos ausentes', async ({ client, assert }) => {
    const response = await client.request(SIGNUP, 'POST').json({})

    response.assertStatus(422)
    assert.sameMembers(
      errorsOf(response).map((error) => error.field),
      ['fullName', 'email', 'password', 'passwordConfirmation']
    )
    for (const error of errorsOf(response)) {
      assert.equal(error.rule, 'required')
      assert.equal(error.message, `The ${error.field} field must be defined`)
      assert.notProperty(error, 'meta')
    }
  })

  test('Valor no textual')
    .with(['fullName', 'email', 'password', 'passwordConfirmation'])
    .run(async ({ client, assert }, field) => {
      const response = await signup(client, { [field]: 123 })

      response.assertStatus(422)
      const error = errorFor(response, field)
      assert.equal(error?.rule, 'string')
      assert.equal(error?.message, `The ${field} field must be a string`)
    })

  test('Email con formato no válido', async ({ client, assert }) => {
    const response = await signup(client, { email: 'no-es-un-email' })

    response.assertStatus(422)
    const error = errorFor(response, 'email')
    assert.equal(error?.rule, 'email')
    assert.equal(error?.message, 'The email field must be a valid email address')
  })

  test('Email demasiado largo', async ({ client, assert }) => {
    // Valid format: the local part is at most 64 characters, the rest is the domain.
    const email = `${'a'.repeat(60)}@${'b'.repeat(60)}.${'c'.repeat(60)}.${'d'.repeat(60)}.${'e'.repeat(10)}.com`
    assert.isAbove(email.length, 254)

    const response = await signup(client, { email })

    response.assertStatus(422)
    const error = errorFor(response, 'email')
    assert.equal(error?.rule, 'email')
  })

  test('Contraseña demasiado corta')
    .with(['password', 'passwordConfirmation'])
    .run(async ({ client, assert }, field) => {
      const response = await signup(client, { [field]: 'a'.repeat(7) })

      response.assertStatus(422)
      const error = errorFor(response, field)
      assert.equal(error?.rule, 'minLength')
      assert.equal(error?.meta?.min, 8)
    })

  test('Contraseña demasiado larga')
    .with(['password', 'passwordConfirmation'])
    .run(async ({ client, assert }, field) => {
      const response = await signup(client, { [field]: 'a'.repeat(33) })

      response.assertStatus(422)
      const error = errorFor(response, field)
      assert.equal(error?.rule, 'maxLength')
      assert.equal(error?.meta?.max, 32)
    })

  test('Confirmación distinta', async ({ client, assert }) => {
    const response = await signup(client, { passwordConfirmation: 'otra-password' })

    response.assertStatus(422)
    const error = errorFor(response, 'passwordConfirmation')
    assert.equal(error?.rule, 'sameAs')
    assert.equal(error?.meta?.otherField, 'password')
    assert.equal(
      error?.message,
      'The passwordConfirmation field and password field must be the same'
    )
  })

  test('Como máximo un error por campo', async ({ client, assert }) => {
    // Breaks minLength and sameAs at once.
    const response = await signup(client, { passwordConfirmation: 'corta' })

    response.assertStatus(422)
    const fields = errorsOf(response).map((error) => error.field)
    assert.lengthOf(fields, new Set(fields).size)
  })
})

test.group('Requirement: Unicidad del email', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Email ya registrado', async ({ client, assert }) => {
    await tokenFor(client)

    const response = await signup(client)

    response.assertStatus(422)
    const error = errorFor(response, 'email')
    assert.equal(error?.rule, 'database.unique')
    assert.equal(error?.message, 'The email has already been taken')
  })

  test('Email que solo difiere en mayúsculas', async ({ client, assert }) => {
    await tokenFor(client, { email: 'ana@example.com' })

    const response = await signup(client, { email: 'Ana@example.com' })

    response.assertStatus(200)
    assert.lengthOf(await User.query().whereIn('email', ['ana@example.com', 'Ana@example.com']), 2)
  })
})

test.group('Requirement: Normalización de textos de entrada', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Email con espacios alrededor', async ({ client, assert }) => {
    const response = await signup(client, { email: '  ada@example.com  ' })

    response.assertStatus(200)
    assert.equal(response.body().data.user.email, 'ada@example.com')
  })

  test('Nombre en blanco por API')
    .with(['', '    '])
    .run(async ({ client, assert }, fullName) => {
      const response = await signup(client, { fullName })

      response.assertStatus(200)
      assert.isNull(response.body().data.user.fullName)
    })

  test('Campo obligatorio en blanco')
    .with(['', '    '])
    .run(async ({ client, assert }, blank) => {
      const response = await client.request(LOGIN, 'POST').json({ email: blank, password: blank })

      response.assertStatus(422)
      assert.equal(errorFor(response, 'email')?.rule, 'required')
      assert.equal(errorFor(response, 'password')?.rule, 'required')
    })

  test('Contraseña con espacios alrededor', async ({ client }) => {
    await tokenFor(client, { password: `  ${PASSWORD}  `, passwordConfirmation: `  ${PASSWORD}  ` })

    const response = await login(client, 'ada@example.com', PASSWORD)

    response.assertStatus(200)
  })

  test('Longitud medida tras recortar', async ({ client, assert }) => {
    const response = await signup(client, { password: ' abcdefg ' })

    response.assertStatus(422)
    assert.equal(errorFor(response, 'password')?.rule, 'minLength')
  })
})

test.group('Requirement: Inicio de sesión por API', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Credenciales correctas', async ({ client, assert }) => {
    await tokenFor(client)

    const response = await login(client)

    response.assertStatus(200)
    const { data } = response.body()
    assert.sameMembers(Object.keys(data), ['user', 'token'])
    assert.sameMembers(Object.keys(data.user), USER_KEYS)
    assert.isString(data.token)
    assert.notInclude(JSON.stringify(response.body()), PASSWORD)
  })

  test('Inicios de sesión repetidos', async ({ client, assert }) => {
    await tokenFor(client)

    const first = (await login(client)).body().data.token
    const second = (await login(client)).body().data.token

    assert.notEqual(first, second)
    ;(await profile(client, first)).assertStatus(200)
    ;(await profile(client, second)).assertStatus(200)
  })
})

test.group('Requirement: Rechazo de credenciales incorrectas', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const INVALID = { errors: [{ message: 'Invalid user credentials' }] }

  test('Email desconocido', async ({ client }) => {
    const response = await login(client, 'nadie@example.com')

    response.assertStatus(400)
    response.assertBody(INVALID)
  })

  test('Contraseña incorrecta')
    .with(['x', 'password-incorrecta', 'x'.repeat(100)])
    .run(async ({ client }, password) => {
      await tokenFor(client)

      const response = await login(client, 'ada@example.com', password)

      response.assertStatus(400)
      response.assertBody(INVALID)
    })

  test('Email con otras mayúsculas', async ({ client }) => {
    await tokenFor(client, { email: 'ana@example.com' })

    const response = await login(client, 'ANA@example.com')

    response.assertStatus(400)
    response.assertBody(INVALID)
  })
})

test.group('Requirement: Validación del inicio de sesión por API', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Datos ausentes', async ({ client, assert }) => {
    const response = await client.request(LOGIN, 'POST').json({})

    response.assertStatus(422)
    assert.sameMembers(
      errorsOf(response).map((error) => error.field),
      ['email', 'password']
    )
    for (const error of errorsOf(response)) {
      assert.equal(error.rule, 'required')
    }
  })

  test('Email no válido', async ({ client, assert }) => {
    const response = await login(client, 'no-es-un-email')

    response.assertStatus(422)
    assert.equal(errorFor(response, 'email')?.rule, 'email')
  })

  test('Email demasiado largo', async ({ client, assert }) => {
    const email = `${'a'.repeat(60)}@${'b'.repeat(60)}.${'c'.repeat(60)}.${'d'.repeat(60)}.${'e'.repeat(10)}.com`

    const response = await login(client, email)

    response.assertStatus(422)
    const error = errorFor(response, 'email')
    assert.equal(error?.rule, 'email')
  })

  test('Contraseña corta', async ({ client }) => {
    await tokenFor(client)

    const response = await login(client, 'ada@example.com', 'corta')

    response.assertStatus(400)
  })
})

test.group('Requirement: Respuestas de error en JSON', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Cliente que pide HTML', async ({ client, assert }) => {
    const response = await client.request(SIGNUP, 'POST').header('Accept', 'text/html').json({})

    response.assertStatus(422)
    assert.include(response.header('content-type'), 'application/json')
    assert.isArray(response.body().errors)
  })

  test('Error inesperado en producción', async ({ assert }) => {
    // A real server in production mode. Its session store has no table, so every request fails.
    const port = 3399
    const server = spawn(process.execPath, ['--import=@poppinss/ts-exec', 'bin/server.ts'], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(port),
        LOG_LEVEL: 'silent',
        SESSION_DRIVER: 'database',
      },
      stdio: 'ignore',
    })

    try {
      let response: Response | undefined
      for (let attempt = 0; attempt < 40 && !response; attempt++) {
        response = await fetch(`http://localhost:${port}${LOGIN}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'ada@example.com', password: PASSWORD }),
        }).catch(async () => {
          await new Promise((resolve) => setTimeout(resolve, 500))
          return undefined
        })
      }

      assert.equal(response?.status, 500)
      const body = (await response?.json()) as Record<string, unknown>
      assert.sameMembers(Object.keys(body), ['message'])
      assert.isString(body.message)
    } finally {
      server.kill()
    }
  }).timeout(30_000)

  test('Error inesperado fuera de producción', async ({ client, assert, cleanup }) => {
    const original = User.accessTokens.create
    User.accessTokens.create = async () => {
      throw new Error('fallo provocado por el test')
    }
    cleanup(() => {
      User.accessTokens.create = original
    })
    await tokenFor(client).catch(() => undefined)

    const response = await login(client)

    response.assertStatus(500)
    assert.include(response.header('content-type'), 'json')
    assert.include(JSON.stringify(response.body()), 'fallo provocado por el test')
    assert.notDeepEqual(response.body(), { message: 'fallo provocado por el test' })
  })
})

test.group('Requirement: Autenticación por token', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const UNAUTHORIZED = { errors: [{ message: 'Unauthorized access' }] }
  const ROUTES = [
    { method: 'GET', url: PROFILE },
    { method: 'POST', url: LOGOUT },
  ]

  test('Sin credencial')
    .with(ROUTES)
    .run(async ({ client }, route) => {
      const response = await client
        .request(route.url, route.method)
        .header('Cookie', 'adonis-session=cualquiera')

      response.assertStatus(401)
      response.assertBody(UNAUTHORIZED)
    })

  test('Esquema o token mal formados')
    .with(
      ROUTES.flatMap((route) =>
        ['Basic abc', 'Bearer mal-formado'].map((header) => ({ ...route, header }))
      )
    )
    .run(async ({ client }, { method, url, header }) => {
      const response = await client.request(url, method).header('Authorization', header)

      response.assertStatus(401)
      response.assertBody(UNAUTHORIZED)
    })

  test('Token desconocido o revocado')
    .with(ROUTES)
    .run(async ({ client }, route) => {
      const revoked = await tokenFor(client)
      ;(await logout(client, revoked)).assertStatus(200)
      const unknown = revoked.slice(0, -4) + 'zzzz'

      for (const token of [revoked, unknown]) {
        const response = await client
          .request(route.url, route.method)
          .header('Authorization', `Bearer ${token}`)

        response.assertStatus(401)
        response.assertBody(UNAUTHORIZED)
      }
    })
})

test.group('Requirement: Indiferencia de las rutas públicas al token', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Token no válido en ruta pública', async ({ client, assert }) => {
    await tokenFor(client)

    const response = await login(client).header('Authorization', 'Bearer token-no-valido')

    response.assertStatus(200)
    assert.isString(response.body().data.token)
  })

  test('Token válido en ruta pública', async ({ client, assert }) => {
    const token = await tokenFor(client)

    const response = await signup(client, { email: 'otra@example.com' }).header(
      'Authorization',
      `Bearer ${token}`
    )

    response.assertStatus(200)
    assert.equal(response.body().data.user.email, 'otra@example.com')
  })
})

test.group('Requirement: Consulta del perfil por API', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Perfil con token vigente', async ({ client, assert }) => {
    const token = await tokenFor(client)

    const response = await profile(client, token)

    response.assertStatus(200)
    assert.sameMembers(Object.keys(response.body()), ['data'])
    assert.sameMembers(Object.keys(response.body().data), USER_KEYS)
    assert.equal(response.body().data.email, 'ada@example.com')
  })
})

test.group('Requirement: Cierre de sesión por API', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Cierre correcto', async ({ client }) => {
    const token = await tokenFor(client)

    const response = await logout(client, token)

    response.assertStatus(200)
    response.assertBody({ message: 'Logged out successfully' })
  })

  test('Reutilización del token revocado', async ({ client }) => {
    const token = await tokenFor(client)
    ;(await logout(client, token)).assertStatus(200)

    ;(await profile(client, token)).assertStatus(401)
    ;(await logout(client, token)).assertStatus(401)
  })

  test('Otros tokens de la misma cuenta', async ({ client }) => {
    const first = await tokenFor(client)
    const second = (await login(client)).body().data.token

    ;(await logout(client, first)).assertStatus(200)

    ;(await profile(client, second)).assertStatus(200)
  })
})

test.group('Requirement: Vigencia de los tokens', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Token antiguo no revocado', async ({ client, assert }) => {
    const token = await tokenFor(client)
    const tenYearsAgo = new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000)
    await db.from('auth_access_tokens').update({ created_at: tenYearsAgo, updated_at: tenYearsAgo })

    const rows = await db.from('auth_access_tokens').select('expires_at')
    assert.isTrue(rows.every((row) => row.expires_at === null))
    ;(await profile(client, token)).assertStatus(200)
  })
})

test.group('Requirement: Cálculo de iniciales', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const initialsOf = async (client: ApiClient, overrides: Record<string, unknown>) => {
    const response = await signup(client, overrides)
    response.assertStatus(200)
    return response.body().data.user.initials
  }

  test('Nombre de dos o más palabras', async ({ client, assert }) => {
    assert.equal(await initialsOf(client, { fullName: 'Ana María López' }), 'AM')
  })

  test('Nombre de una palabra', async ({ client, assert }) => {
    assert.equal(await initialsOf(client, { fullName: 'Ada' }), 'AD')
  })

  test('Nombre con doble espacio interior', async ({ client, assert }) => {
    assert.equal(await initialsOf(client, { fullName: 'Ada  Lovelace' }), 'AD')
  })

  test('Cuenta sin nombre', async ({ client, assert }) => {
    assert.equal(await initialsOf(client, { fullName: null, email: 'ana@example.com' }), 'AE')
  })
})
