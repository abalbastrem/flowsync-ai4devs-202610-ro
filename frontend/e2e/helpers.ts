import { expect, type Browser, type Locator, type Page } from '@playwright/test'

let sequence = 0
const unique = (prefix: string) => {
  sequence += 1
  return `${prefix}-${Date.now()}-${sequence}`
}

/** Registers a new person in a browser context of their own and leaves them on the list. */
export async function signUp(
  browser: Browser,
  fullName: string,
): Promise<Page> {
  const page = await (await browser.newContext()).newPage()

  await page.goto('/register')
  await page.locator('#fullName').fill(fullName)
  await page.locator('#email').fill(`${unique('user')}@example.com`)
  await page.locator('#password').fill('password123')
  await page.locator('#passwordConfirmation').fill('password123')
  await page.locator('button[type=submit]').click()
  await expect(
    page.getByRole('heading', { name: 'Tareas del equipo' }),
  ).toBeVisible()

  return page
}

/** A title no other test uses, so tests never depend on each other's data. */
export const uniqueTitle = (base: string) => `${base} ${unique('t')}`

export async function createTask(page: Page, title: string) {
  await page.getByLabel('Título').fill(title)
  await page.getByRole('button', { name: 'Crear tarea' }).click()
}

export const rowOf = (page: Page, title: string): Locator =>
  page.getByRole('list', { name: 'Tareas' }).getByRole('listitem').filter({
    hasText: title,
  })
