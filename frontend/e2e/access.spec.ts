import { expect, test, type Page } from '@playwright/test'

/**
 * Everything real: what the component tests simulate has to hold against the real API.
 * Covers the critical path and the error messages that depend on what the backend sends.
 */

const PASSWORD = 'password123'

let sequence = 0
const uniqueEmail = () => {
  sequence += 1
  return `user-${Date.now()}-${sequence}@example.com`
}

const fillRegister = async (
  page: Page,
  { fullName = '', email = '', password = '', confirmation = '' },
) => {
  await page.goto('/register')
  await page.getByLabel(/Nombre completo/).fill(fullName)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByLabel('Repite la contraseña').fill(confirmation)
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
}

const register = async (
  page: Page,
  fullName: string,
  email = uniqueEmail(),
) => {
  await fillRegister(page, {
    fullName,
    email,
    password: PASSWORD,
    confirmation: PASSWORD,
  })
  await page.waitForURL('**/profile')
  return email
}

const fieldError = (page: Page, id: string) => page.locator(`#${id}-error`)

test('recorrido completo: registro, recarga, salida, error de acceso y entrada', async ({
  page,
}) => {
  const email = await register(page, 'Ana María López')
  await expect(page.getByText('Ana María López')).toBeVisible()
  await expect(page.getByText('AM', { exact: true })).toBeVisible()
  await expect(page.getByText(email)).toBeVisible()
  await expect(page.getByText('Miembro desde')).toBeVisible()

  await page.reload()
  await expect(page.getByText('Ana María López')).toBeVisible()

  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await page.waitForURL('**/login')
  await expect(page.getByRole('alert')).toHaveCount(0)

  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Contraseña').fill('contraseña-incorrecta')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('alert')).toHaveText(
    'El email o la contraseña no son correctos.',
  )

  await page.getByLabel('Contraseña').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL('**/profile')
  await expect(page.getByText('Ana María López')).toBeVisible()
})

test('tras salir, el retroceso no vuelve al perfil y abrir la dirección lleva al login', async ({
  page,
}) => {
  // /login -> /register, the only history entries: the rest of the navigations replace.
  await page.goto('/login')
  await page.getByRole('link', { name: 'Crea una' }).click()
  await page.waitForURL('**/register')
  await page.getByLabel('Email').fill(uniqueEmail())
  await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD)
  await page.getByLabel('Repite la contraseña').fill(PASSWORD)
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await page.waitForURL('**/profile')
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await page.waitForURL('**/login')

  await page.goBack()
  await page.waitForURL('**/login')
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toHaveCount(
    0,
  )

  await page.goto('/profile')
  await page.waitForURL('**/login')
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toHaveCount(
    0,
  )
})

test('registro con nombre en blanco: el perfil muestra Sin nombre', async ({
  page,
}) => {
  await register(page, '    ')

  await expect(page.getByText('Sin nombre')).toBeVisible()
})

test('errores de validación del registro con la API real', async ({ page }) => {
  await fillRegister(page, {})
  await expect(fieldError(page, 'email')).toHaveText('Falta rellenar el email.')
  await expect(fieldError(page, 'password')).toHaveText(
    'Falta rellenar la contraseña.',
  )
  await expect(fieldError(page, 'passwordConfirmation')).toHaveText(
    'Falta rellenar la confirmación de la contraseña.',
  )
  await expect(fieldError(page, 'fullName')).toHaveCount(0)

  await fillRegister(page, {
    email: 'no-es-un-email',
    password: PASSWORD,
    confirmation: PASSWORD,
  })
  await expect(fieldError(page, 'email')).toHaveText(
    'Introduce una dirección de email válida.',
  )

  await fillRegister(page, {
    email: uniqueEmail(),
    password: 'corta',
    confirmation: 'corta',
  })
  await expect(fieldError(page, 'password')).toHaveText(
    'la contraseña debe tener al menos 8 caracteres.',
  )
  await expect(fieldError(page, 'passwordConfirmation')).toHaveText(
    'la confirmación de la contraseña debe tener al menos 8 caracteres.',
  )
  await expect(page.getByText('Entre 8 y 32 caracteres.')).toHaveCount(0)

  const long = 'a'.repeat(33)
  await fillRegister(page, {
    email: uniqueEmail(),
    password: long,
    confirmation: long,
  })
  await expect(fieldError(page, 'password')).toHaveText(
    'la contraseña no puede superar los 32 caracteres.',
  )
  await expect(fieldError(page, 'passwordConfirmation')).toHaveText(
    'la confirmación de la contraseña no puede superar los 32 caracteres.',
  )
})

test('email ya registrado con la API real', async ({ browser }) => {
  const first = await (await browser.newContext()).newPage()
  const email = await register(first, 'Ada')

  const second = await (await browser.newContext()).newPage()
  await fillRegister(second, {
    email,
    password: PASSWORD,
    confirmation: PASSWORD,
  })

  await expect(fieldError(second, 'email')).toHaveText(
    'Ese email ya está registrado. Inicia sesión en su lugar.',
  )
})

test('errores de validación del inicio de sesión con la API real', async ({
  page,
}) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(fieldError(page, 'email')).toHaveText('Falta rellenar el email.')
  await expect(fieldError(page, 'password')).toHaveText(
    'Falta rellenar la contraseña.',
  )

  const longEmail = `a@${'b'.repeat(60)}.${'c'.repeat(60)}.${'d'.repeat(60)}.${'e'.repeat(60)}.${'f'.repeat(10)}.com`
  await page.getByLabel('Email').fill(longEmail)
  await page.getByLabel('Contraseña').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(fieldError(page, 'email')).toHaveText(
    'Introduce una dirección de email válida.',
  )
})

test('sesión guardada que el servidor rechaza', async ({ page }) => {
  await page.goto('/login')
  await page.evaluate(() =>
    localStorage.setItem('flowsync.token', 'oat_token.no-valido'),
  )

  await page.goto('/profile')

  await page.waitForURL('**/login')
  await expect(page.getByRole('alert')).toHaveText(
    'Tu sesión ha caducado. Vuelve a iniciar sesión.',
  )
  expect(
    await page.evaluate(() => localStorage.getItem('flowsync.token')),
  ).toBeNull()
})

test('dos pestañas: la otra no se entera hasta recargar', async ({
  context,
}) => {
  const first = await context.newPage()
  await register(first, 'Grace Hopper')
  const second = await context.newPage()
  await second.goto('/profile')
  await expect(second.getByText('Grace Hopper')).toBeVisible()

  await first.getByRole('button', { name: 'Cerrar sesión' }).click()
  await first.waitForURL('**/login')

  await expect(second.getByText('Grace Hopper')).toBeVisible()

  await second.getByRole('button', { name: 'Cerrar sesión' }).click()
  await second.waitForURL('**/login')
  await expect(second.getByRole('alert')).toHaveCount(0)
})
