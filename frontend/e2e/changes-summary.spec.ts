import { expect, test, type Browser, type Page } from '@playwright/test'

const SUMMARY = 'Cambios desde tu última visita'

let sequence = 0
const unique = (name: string) => {
  sequence += 1
  return `${name} ${Date.now()}-${sequence}`
}

const signUp = async (browser: Browser, fullName: string) => {
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto('/register')
  await page.locator('#fullName').fill(fullName)
  await page
    .locator('#email')
    .fill(`${unique('user').replace(/\s/g, '')}@example.com`)
  await page.locator('#password').fill('password123')
  await page.locator('#passwordConfirmation').fill('password123')
  await page.locator('button[type=submit]').click()
  await page.waitForURL('**/tasks')

  return page
}

const createTask = async (page: Page, title: string) => {
  await page.getByLabel('Nueva tarea').fill(title)
  await page.getByRole('button', { name: 'Crear' }).click()
  await expect(page.getByText(title, { exact: true })).toBeVisible()
}

/** Waits for the reload's visit to finish, so that it has really been counted. */
const reload = async (page: Page) => {
  const visited = page.waitForResponse((response) =>
    response.url().endsWith('/api/v1/account/visits'),
  )
  await page.reload()
  await visited
}

test('the summary shows what others did since my last visit, only once', async ({
  browser,
}) => {
  const ada = await signUp(browser, 'Ada Lovelace')
  const earlier = unique('Earlier')
  await createTask(ada, earlier)

  const grace = await signUp(browser, 'Grace Hopper')
  const summary = grace.getByRole('region', { name: SUMMARY })

  // First visit: earlier changes are not news.
  await expect(grace.getByText(earlier, { exact: true })).toBeVisible()
  await expect(summary).toBeHidden()

  const title = unique('Created')
  const renamed = unique('Renamed')
  await createTask(ada, title)
  await ada.getByRole('button', { name: `Editar ${title}` }).click()
  await ada.getByRole('textbox', { name: `Título de ${title}` }).fill(renamed)
  await ada.getByRole('button', { name: 'Guardar' }).click()
  await expect(ada.getByText(renamed, { exact: true })).toBeVisible()

  await reload(grace)

  await expect(summary.getByRole('listitem')).toHaveText([
    `Ada Lovelace creó «${title}»`,
    `Ada Lovelace renombró «${title}» a «${renamed}»`,
  ])
  await expect(summary).toBeVisible()
  // It stays through the refreshes of the list.
  await grace.waitForTimeout(3500)
  await expect(summary).toBeVisible()

  // Reloading is a new visit: the same changes do not come back, nor do my own.
  await createTask(grace, unique('Mine'))
  await reload(grace)
  await expect(grace.getByText(renamed, { exact: true })).toBeVisible()
  await expect(summary).toBeHidden()

  // A deleted task can still be reported.
  await ada.getByRole('button', { name: `Borrar ${renamed}` }).click()
  await ada
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Borrar', exact: true })
    .click()
  await expect(ada.getByText(renamed, { exact: true })).toBeHidden()

  await reload(grace)
  await expect(summary.getByRole('listitem')).toHaveText([
    `Ada Lovelace borró «${renamed}»`,
  ])

  await ada.context().close()
  await grace.context().close()
})
