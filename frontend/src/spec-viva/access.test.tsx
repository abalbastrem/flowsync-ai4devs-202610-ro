import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation, useNavigate } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/auth/auth-provider'
import { AppRoutes } from '@/routes/app-routes'

/**
 * Executable version of the screen requirements in docs/spec-viva/abm.md: each describe
 * is a Requirement and each test a Scenario, with the same titles. They describe what the
 * app does today, so a failure means the spec is wrong, not the code. The API is
 * simulated with the bodies the real one returns (see the backend tests and e2e/).
 */

const TOKEN_KEY = 'flowsync.token'
const USER = {
  id: 1,
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  initials: 'AL',
  createdAt: '2026-11-03T12:00:00.000Z',
  updatedAt: '2026-11-03T12:00:00.000Z',
}

const LOGIN = 'POST /api/v1/auth/login'
const SIGNUP = 'POST /api/v1/auth/signup'
const PROFILE = 'GET /api/v1/account/profile'
const LOGOUT = 'POST /api/v1/account/logout'

const CONNECTION_ERROR =
  'No se pudo conectar con el servidor. Comprueba que el backend está arrancado.'
const SERVER_ERROR =
  'Algo ha ido mal en el servidor. Inténtalo de nuevo en un momento.'
const EXPIRED = 'Tu sesión ha caducado. Vuelve a iniciar sesión.'
const BAD_CREDENTIALS = 'El email o la contraseña no son correctos.'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const ok = (user = USER) => json(200, { data: { user, token: 'nuevo-token' } })
const profileOk = (user = USER) => json(200, { data: user })
const unauthorized = () =>
  json(401, { errors: [{ message: 'Unauthorized access' }] })
const badCredentials = () =>
  json(400, { errors: [{ message: 'Invalid user credentials' }] })
const serverError = () => new Response('<h1>Error</h1>', { status: 500 })
const invalid = (
  ...errors: {
    field: string
    rule: string
    meta?: Record<string, unknown>
  }[]
) =>
  json(422, {
    errors: errors.map((error) => ({ message: 'irrelevante', ...error })),
  })

const pending = () => {
  let resolve!: (response: Response) => void
  const promise = new Promise<Response>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

type Route = () => Response | Promise<Response>

const calls: { route: string; body: unknown; authorization?: string }[] = []

/** Answers each `METHOD /path` with its route; anything else fails the test. */
const backend = (routes: Record<string, Route>) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const route = `${init.method ?? 'GET'} ${new URL(url).pathname}`
      const headers = init.headers as Record<string, string>
      calls.push({
        route,
        body: init.body ? JSON.parse(init.body as string) : undefined,
        authorization: headers.Authorization,
      })
      const answer = routes[route]
      if (!answer) throw new Error(`Unexpected request: ${route}`)
      return answer()
    }),
  )
}

const unreachable: Route = () =>
  Promise.reject(new TypeError('Failed to fetch'))

let navigate: ReturnType<typeof useNavigate>

function Probe() {
  navigate = useNavigate()
  return <div data-testid="path">{useLocation().pathname}</div>
}

const openApp = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <AppRoutes />
        <Probe />
      </AuthProvider>
    </MemoryRouter>,
  )

const expectPath = (path: string) =>
  waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent(path))

const withStoredSession = () =>
  localStorage.setItem(TOKEN_KEY, 'token-guardado')

const button = (name: string) => screen.getByRole('button', { name })

const fillLogin = async (email: string, password: string) => {
  const user = userEvent.setup()
  if (email) await user.type(screen.getByLabelText('Email'), email)
  if (password) await user.type(screen.getByLabelText('Contraseña'), password)
  return user
}

const fillRegister = async ({
  fullName = '',
  email = '',
  password = '',
  confirmation = '',
}) => {
  const user = userEvent.setup()
  if (fullName)
    await user.type(screen.getByLabelText(/Nombre completo/), fullName)
  if (email) await user.type(screen.getByLabelText('Email'), email)
  if (password) await user.type(screen.getByLabelText('Contraseña'), password)
  if (confirmation)
    await user.type(screen.getByLabelText('Repite la contraseña'), confirmation)
  return user
}

const LONG_EMAIL = `a@${'b'.repeat(60)}.${'c'.repeat(60)}.${'d'.repeat(60)}.${'e'.repeat(60)}.${'f'.repeat(10)}.com`

beforeEach(() => {
  localStorage.clear()
  calls.length = 0
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Requirement: Acceso a pantallas según la sesión', () => {
  it('Pantalla protegida sin sesión', async () => {
    backend({})
    openApp('/profile')

    await expectPath('/login')
    expect(calls).toHaveLength(0)
  })

  it.each(['/login', '/register'])(
    'Pantallas de acceso con sesión (%s)',
    async (path) => {
      withStoredSession()
      backend({ [PROFILE]: () => profileOk() })
      openApp(path)

      await expectPath('/profile')
    },
  )

  it('Otra dirección', async () => {
    backend({})
    const { unmount } = openApp('/cualquier/otra')
    await expectPath('/login')
    unmount()

    withStoredSession()
    backend({ [PROFILE]: () => profileOk() })
    openApp('/cualquier/otra')
    await expectPath('/profile')
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
  })
})

describe('Requirement: Indicador de comprobación de sesión', () => {
  it.each(['/login', '/register', '/profile'])(
    'Carga con sesión guardada (%s)',
    async (path) => {
      withStoredSession()
      const profile = pending()
      backend({ [PROFILE]: () => profile.promise })
      openApp(path)

      expect(screen.getByRole('status')).toHaveTextContent('Cargando…')
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
      expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument()

      await act(async () => profile.resolve(profileOk()))
    },
  )
})

describe('Requirement: Pantalla de inicio de sesión', () => {
  it('Contenido de la pantalla', () => {
    backend({})
    openApp('/login')

    expect(screen.getByText('FlowSync')).toBeInTheDocument()
    expect(screen.getByText('Inicia sesión')).toBeInTheDocument()
    expect(
      screen.getByText('Entra con tu cuenta para volver a tus tareas.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'placeholder',
      'tu@email.com',
    )
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    expect(button('Entrar')).toBeInTheDocument()
    expect(screen.getByText(/¿Aún no tienes cuenta\?/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Crea una' })).toBeInTheDocument()
  })

  it('Ir al registro', async () => {
    backend({})
    openApp('/login')

    await userEvent.click(screen.getByRole('link', { name: 'Crea una' }))

    await expectPath('/register')
  })
})

describe('Requirement: Envío del inicio de sesión', () => {
  it('Envío en curso', async () => {
    const answer = pending()
    backend({ [LOGIN]: () => answer.promise })
    openApp('/login')
    const user = await fillLogin('ada@example.com', 'password123')

    await user.click(button('Entrar'))

    expect(button('Entrando…')).toBeDisabled()
    await act(async () => answer.resolve(ok()))
  })

  it('Credenciales aceptadas', async () => {
    backend({ [LOGIN]: () => ok() })
    openApp('/login')
    const user = await fillLogin('ada@example.com', 'password123')

    await user.click(button('Entrar'))

    await expectPath('/profile')
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(calls[0].body).toEqual({
      email: 'ada@example.com',
      password: 'password123',
    })
  })
})

describe('Requirement: Errores del inicio de sesión', () => {
  it('Credenciales rechazadas', async () => {
    backend({ [LOGIN]: badCredentials })
    openApp('/login')
    const user = await fillLogin('ada@example.com', 'mala')

    await user.click(button('Entrar'))

    expect(await screen.findByRole('alert')).toHaveTextContent(BAD_CREDENTIALS)
    await expectPath('/login')
  })

  it('Formulario vacío', async () => {
    backend({
      [LOGIN]: () =>
        invalid(
          { field: 'email', rule: 'required' },
          { field: 'password', rule: 'required' },
        ),
    })
    openApp('/login')

    await userEvent.click(button('Entrar'))

    await waitFor(() =>
      expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
        'Falta rellenar el email.',
      ),
    )
    expect(screen.getByLabelText('Contraseña')).toHaveAccessibleDescription(
      'Falta rellenar la contraseña.',
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('Email con formato no válido', async () => {
    backend({ [LOGIN]: () => invalid({ field: 'email', rule: 'email' }) })
    openApp('/login')
    const user = await fillLogin('no-es-un-email', 'password123')

    await user.click(button('Entrar'))

    await waitFor(() =>
      expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
        'Introduce una dirección de email válida.',
      ),
    )
  })

  it('Email demasiado largo', async () => {
    backend({ [LOGIN]: () => invalid({ field: 'email', rule: 'email' }) })
    openApp('/login')
    const user = userEvent.setup()
    await user.click(screen.getByLabelText('Email'))
    await user.paste(LONG_EMAIL)
    await user.type(screen.getByLabelText('Contraseña'), 'password123')

    await user.click(button('Entrar'))

    await waitFor(() =>
      expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
        'Introduce una dirección de email válida.',
      ),
    )
  })

  it('Nuevo intento', async () => {
    const second = pending()
    const answers = [badCredentials, () => second.promise]
    backend({ [LOGIN]: () => answers.shift()!() })
    openApp('/login')
    const user = await fillLogin('ada@example.com', 'mala')
    await user.click(button('Entrar'))
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    await user.click(button('Entrar'))

    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
    )
    await act(async () => second.resolve(badCredentials()))
  })
})

describe('Requirement: Pantalla de registro', () => {
  it('Contenido de la pantalla', () => {
    backend({})
    openApp('/register')

    expect(screen.getByText('FlowSync')).toBeInTheDocument()
    expect(screen.getByText('Crea tu cuenta')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Regístrate para empezar a organizar el trabajo del equipo.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre completo (opcional)')).toHaveAttribute(
      'placeholder',
      'Ada Lovelace',
    )
    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'placeholder',
      'tu@email.com',
    )
    expect(screen.getByLabelText('Contraseña')).toHaveAccessibleDescription(
      'Entre 8 y 32 caracteres.',
    )
    expect(screen.getByLabelText('Repite la contraseña')).toBeInTheDocument()
    expect(button('Crear cuenta')).toBeInTheDocument()
    expect(screen.getByText(/¿Ya tienes cuenta\?/)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Inicia sesión' }),
    ).toBeInTheDocument()
  })

  it('Ir al inicio de sesión', async () => {
    backend({})
    openApp('/register')

    await userEvent.click(screen.getByRole('link', { name: 'Inicia sesión' }))

    await expectPath('/login')
  })
})

describe('Requirement: Comprobación local de contraseñas', () => {
  it('Contraseñas distintas', async () => {
    backend({})
    openApp('/register')
    const user = await fillRegister({
      email: 'no-es-un-email',
      password: 'password123',
      confirmation: 'otra-password',
    })

    await user.click(button('Crear cuenta'))

    expect(
      screen.getByLabelText('Repite la contraseña'),
    ).toHaveAccessibleDescription('Las contraseñas no coinciden.')
    expect(calls).toHaveLength(0)
  })
})

describe('Requirement: Envío del registro', () => {
  it('Envío en curso', async () => {
    const answer = pending()
    backend({ [SIGNUP]: () => answer.promise })
    openApp('/register')
    const user = await fillRegister({
      email: 'ada@example.com',
      password: 'password123',
      confirmation: 'password123',
    })

    await user.click(button('Crear cuenta'))

    expect(button('Creando cuenta…')).toBeDisabled()
    await act(async () => answer.resolve(ok()))
  })

  it('Registro aceptado', async () => {
    backend({ [SIGNUP]: () => ok() })
    openApp('/register')
    const user = await fillRegister({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'password123',
      confirmation: 'password123',
    })

    await user.click(button('Crear cuenta'))

    await expectPath('/profile')
    expect(localStorage.getItem(TOKEN_KEY)).toBe('nuevo-token')
  })

  it('Nombre en blanco', async () => {
    backend({ [SIGNUP]: () => ok({ ...USER, fullName: null as never }) })
    openApp('/register')
    const user = await fillRegister({
      fullName: '    ',
      email: 'ada@example.com',
      password: 'password123',
      confirmation: 'password123',
    })

    await user.click(button('Crear cuenta'))

    await expectPath('/profile')
    expect(screen.getByText('Sin nombre')).toBeInTheDocument()
    expect((calls[0].body as { fullName: unknown }).fullName).toBeNull()
  })
})

describe('Requirement: Errores de validación del registro', () => {
  const submitRegister = async (
    fields: Parameters<typeof fillRegister>[0],
    answer: Route,
  ) => {
    backend({ [SIGNUP]: answer })
    openApp('/register')
    const user = await fillRegister(fields)
    await user.click(button('Crear cuenta'))
  }

  it('Email ya registrado', async () => {
    await submitRegister(
      {
        email: 'ada@example.com',
        password: 'password123',
        confirmation: 'password123',
      },
      () => invalid({ field: 'email', rule: 'database.unique' }),
    )

    await waitFor(() =>
      expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
        'Ese email ya está registrado. Inicia sesión en su lugar.',
      ),
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('Formulario vacío', async () => {
    await submitRegister({}, () =>
      invalid(
        { field: 'email', rule: 'required' },
        { field: 'password', rule: 'required' },
        { field: 'passwordConfirmation', rule: 'required' },
      ),
    )

    await waitFor(() =>
      expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
        'Falta rellenar el email.',
      ),
    )
    expect(screen.getByLabelText('Contraseña')).toHaveAccessibleDescription(
      'Falta rellenar la contraseña.',
    )
    expect(
      screen.getByLabelText('Repite la contraseña'),
    ).toHaveAccessibleDescription(
      'Falta rellenar la confirmación de la contraseña.',
    )
    expect(
      screen.getByLabelText(/Nombre completo/),
    ).not.toHaveAccessibleDescription()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('Email con formato no válido', async () => {
    await submitRegister(
      {
        email: 'no-es-un-email',
        password: 'password123',
        confirmation: 'password123',
      },
      () => invalid({ field: 'email', rule: 'email' }),
    )

    await waitFor(() =>
      expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
        'Introduce una dirección de email válida.',
      ),
    )
  })

  it('Contraseña corta', async () => {
    await submitRegister(
      { email: 'ada@example.com', password: 'corta', confirmation: 'corta' },
      () =>
        invalid(
          { field: 'password', rule: 'minLength', meta: { min: 8 } },
          {
            field: 'passwordConfirmation',
            rule: 'minLength',
            meta: { min: 8 },
          },
        ),
    )

    await waitFor(() =>
      expect(screen.getByLabelText('Contraseña')).toHaveAccessibleDescription(
        'la contraseña debe tener al menos 8 caracteres.',
      ),
    )
    expect(
      screen.queryByText('Entre 8 y 32 caracteres.'),
    ).not.toBeInTheDocument()
    expect(
      screen.getByLabelText('Repite la contraseña'),
    ).toHaveAccessibleDescription(
      'la confirmación de la contraseña debe tener al menos 8 caracteres.',
    )
  })

  it('Contraseña larga', async () => {
    const long = 'a'.repeat(33)
    await submitRegister(
      { email: 'ada@example.com', password: long, confirmation: long },
      () =>
        invalid(
          { field: 'password', rule: 'maxLength', meta: { max: 32 } },
          {
            field: 'passwordConfirmation',
            rule: 'maxLength',
            meta: { max: 32 },
          },
        ),
    )

    await waitFor(() =>
      expect(screen.getByLabelText('Contraseña')).toHaveAccessibleDescription(
        'la contraseña no puede superar los 32 caracteres.',
      ),
    )
    expect(
      screen.queryByText('Entre 8 y 32 caracteres.'),
    ).not.toBeInTheDocument()
    expect(
      screen.getByLabelText('Repite la contraseña'),
    ).toHaveAccessibleDescription(
      'la confirmación de la contraseña no puede superar los 32 caracteres.',
    )
  })
})

describe('Requirement: Fallos de comunicación en los formularios', () => {
  const FORMS = [
    { path: '/login', route: LOGIN, submit: 'Entrar' },
    { path: '/register', route: SIGNUP, submit: 'Crear cuenta' },
  ]

  it.each(FORMS)(
    'Servidor inalcanzable ($path)',
    async ({ path, route, submit }) => {
      backend({ [route]: unreachable })
      openApp(path)

      await userEvent.click(button(submit))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        CONNECTION_ERROR,
      )
      expect(button(submit)).toBeEnabled()
    },
  )

  it.each(FORMS)(
    'Error del servidor ($path)',
    async ({ path, route, submit }) => {
      backend({ [route]: serverError })
      openApp(path)

      await userEvent.click(button(submit))

      expect(await screen.findByRole('alert')).toHaveTextContent(SERVER_ERROR)
      expect(button(submit)).toBeEnabled()
    },
  )
})

describe('Requirement: Persistencia de la sesión', () => {
  it('Recarga con sesión válida', async () => {
    backend({ [LOGIN]: () => ok(), [PROFILE]: () => profileOk() })
    const first = openApp('/login')
    const user = await fillLogin('ada@example.com', 'password123')
    await user.click(button('Entrar'))
    await expectPath('/profile')
    first.unmount()

    openApp('/profile')

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
    expect(calls.at(-1)).toMatchObject({
      route: PROFILE,
      authorization: 'Bearer nuevo-token',
    })
  })
})

describe('Requirement: Sesión rechazada por el servidor', () => {
  it('Sesión rechazada', async () => {
    withStoredSession()
    backend({ [PROFILE]: unauthorized })
    const first = openApp('/profile')

    await expectPath('/login')
    expect(await screen.findByRole('alert')).toHaveTextContent(EXPIRED)
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    first.unmount()

    calls.length = 0
    openApp('/profile')
    await expectPath('/login')
    expect(calls).toHaveLength(0)
  })
})

describe('Requirement: Fallo transitorio al restaurar la sesión', () => {
  it('Servidor inalcanzable al restaurar', async () => {
    withStoredSession()
    backend({ [PROFILE]: unreachable })
    openApp('/profile')

    await expectPath('/login')
    expect(await screen.findByRole('alert')).toHaveTextContent(CONNECTION_ERROR)
    expect(localStorage.getItem(TOKEN_KEY)).toBe('token-guardado')
  })

  it('Error del servidor al restaurar', async () => {
    withStoredSession()
    backend({ [PROFILE]: serverError })
    openApp('/profile')

    await expectPath('/login')
    expect(await screen.findByRole('alert')).toHaveTextContent(SERVER_ERROR)
    expect(localStorage.getItem(TOKEN_KEY)).toBe('token-guardado')
  })

  it('Recuperación al recargar', async () => {
    withStoredSession()
    backend({ [PROFILE]: serverError })
    const first = openApp('/profile')
    await expectPath('/login')
    first.unmount()

    backend({ [PROFILE]: () => profileOk() })
    openApp('/profile')

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
    await expectPath('/profile')
  })
})

describe('Requirement: Aviso de sesión perdida', () => {
  /** Opens /login after losing a stored session, with its notice on screen. */
  const openWithLostSession = async (routes: Record<string, Route> = {}) => {
    withStoredSession()
    backend({ [PROFILE]: unauthorized, ...routes })
    openApp('/login')
    expect(await screen.findByRole('alert')).toHaveTextContent(EXPIRED)
  }

  it('Pérdida de sesión desde el registro', async () => {
    withStoredSession()
    backend({ [PROFILE]: unauthorized })
    openApp('/register')

    expect(await screen.findByText('Crea tu cuenta')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('El aviso se conserva al pasar a inicio de sesión', async () => {
    withStoredSession()
    backend({ [PROFILE]: unauthorized })
    openApp('/register')
    await screen.findByText('Crea tu cuenta')

    await userEvent.click(screen.getByRole('link', { name: 'Inicia sesión' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(EXPIRED)
  })

  it('Error general del intento actual', async () => {
    await openWithLostSession({ [LOGIN]: badCredentials })
    const user = await fillLogin('ada@example.com', 'mala')

    await user.click(button('Entrar'))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(BAD_CREDENTIALS),
    )
    expect(screen.queryByText(EXPIRED)).not.toBeInTheDocument()
  })

  it('Error de campo del intento actual', async () => {
    await openWithLostSession({
      [LOGIN]: () => invalid({ field: 'email', rule: 'email' }),
    })
    const user = await fillLogin('no-es-un-email', 'password123')

    await user.click(button('Entrar'))

    await waitFor(() =>
      expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
        'Introduce una dirección de email válida.',
      ),
    )
    expect(screen.getByRole('alert')).toHaveTextContent(EXPIRED)
  })

  it('Envío en curso con aviso previo', async () => {
    const answer = pending()
    await openWithLostSession({ [LOGIN]: () => answer.promise })
    const user = await fillLogin('ada@example.com', 'password123')

    await user.click(button('Entrar'))

    expect(button('Entrando…')).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent(EXPIRED)
    await act(async () => answer.resolve(ok()))
  })

  it('Entrada correcta', async () => {
    await openWithLostSession({
      [LOGIN]: () => ok(),
      [LOGOUT]: () => json(200, { message: 'Logged out successfully' }),
    })
    const user = await fillLogin('ada@example.com', 'password123')
    await user.click(button('Entrar'))
    await expectPath('/profile')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await user.click(button('Cerrar sesión'))

    await expectPath('/login')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('Entrada correcta por registro', async () => {
    withStoredSession()
    backend({
      [PROFILE]: unauthorized,
      [SIGNUP]: () => ok(),
      [LOGOUT]: () => json(200, { message: 'Logged out successfully' }),
    })
    openApp('/register')
    await screen.findByText('Crea tu cuenta')
    const user = await fillRegister({
      email: 'ada@example.com',
      password: 'password123',
      confirmation: 'password123',
    })
    await user.click(button('Crear cuenta'))
    await expectPath('/profile')

    await user.click(button('Cerrar sesión'))

    await expectPath('/login')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('Requirement: Pantalla de perfil', () => {
  const openProfile = async (user = USER) => {
    withStoredSession()
    backend({ [PROFILE]: () => profileOk(user) })
    openApp('/profile')
    await screen.findByRole('button', { name: 'Cerrar sesión' })
  }

  it('Cuenta con nombre', async () => {
    await openProfile()

    expect(screen.getByText('AL')).toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
    expect(screen.getByText('Miembro desde')).toBeInTheDocument()
    expect(screen.getByText('3 de noviembre de 2026')).toBeInTheDocument()
  })

  it('Cuenta sin nombre', async () => {
    await openProfile({ ...USER, fullName: null as never })

    expect(screen.getByText('Sin nombre')).toBeInTheDocument()
  })

  it('Acciones disponibles', async () => {
    await openProfile()

    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})

describe('Requirement: Cierre de sesión en pantalla', () => {
  const openProfile = async (logout: Route) => {
    withStoredSession()
    backend({ [PROFILE]: () => profileOk(), [LOGOUT]: logout })
    openApp('/profile')
    return screen.findByRole('button', { name: 'Cerrar sesión' })
  }

  it('Cerrar sesión', async () => {
    const answer = pending()
    const logoutButton = await openProfile(() => answer.promise)

    await userEvent.click(logoutButton)

    // Before the server answers: it does not wait for it.
    await expectPath('/login')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(calls.at(-1)).toMatchObject({
      route: LOGOUT,
      authorization: 'Bearer token-guardado',
    })
    await act(async () => answer.resolve(json(200, {})))
  })

  it.each([
    ['inalcanzable', unreachable],
    ['con error interno', serverError],
  ])('Fallo del servidor al cerrar (%s)', async (_name, failure) => {
    const logoutButton = await openProfile(failure)

    await userEvent.click(logoutButton)

    await expectPath('/login')
    await waitFor(() => expect(calls.at(-1)?.route).toBe(LOGOUT))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('Volver al perfil tras salir', async () => {
    const logoutButton = await openProfile(() => json(200, {}))
    await userEvent.click(logoutButton)
    await expectPath('/login')

    act(() => {
      void navigate('/profile')
    })

    await expectPath('/login')
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument()

    act(() => {
      void navigate(-1)
    })

    await expectPath('/login')
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument()
  })
})

describe('Requirement: Sesión sin revalidación durante el uso', () => {
  it('Cierre en otra pestaña', async () => {
    withStoredSession()
    backend({ [PROFILE]: () => profileOk() })
    openApp('/profile')
    await screen.findByText('Ada Lovelace')
    const requests = calls.length

    // What this tab sees when another one closes the session.
    localStorage.removeItem(TOKEN_KEY)
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: TOKEN_KEY, newValue: null }),
      )
    })

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    await expectPath('/profile')
    expect(calls).toHaveLength(requests)
  })

  it('Salir con una sesión ya revocada', async () => {
    withStoredSession()
    backend({ [PROFILE]: () => profileOk(), [LOGOUT]: unauthorized })
    openApp('/profile')

    await userEvent.click(
      await screen.findByRole('button', { name: 'Cerrar sesión' }),
    )

    await expectPath('/login')
    await waitFor(() => expect(calls.at(-1)?.route).toBe(LOGOUT))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
