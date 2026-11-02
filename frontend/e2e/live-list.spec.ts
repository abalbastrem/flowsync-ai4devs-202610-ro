import {
  expect,
  test,
  type Browser,
  type Locator,
  type Page,
} from '@playwright/test'

// NFR-1: a change MUST be visible to the others within 5 s.
const LIVE = { timeout: 5000 }

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

const statusOf = (page: Page, title: string): Locator =>
  page.getByRole('combobox', { name: `Estado de ${title}` })

const rowOf = (page: Page, title: string): Locator =>
  page.locator('li', { hasText: title })

test.describe('two people with the list open', () => {
  let ada: Page
  let grace: Page

  test.beforeEach(async ({ browser }) => {
    ada = await signUp(browser, 'Ada Lovelace')
    grace = await signUp(browser, 'Grace Hopper')
  })

  test.afterEach(async () => {
    await ada.context().close()
    await grace.context().close()
  })

  test('each sees what the other does within 5 s, without reloading', async () => {
    const title = unique('Created')
    await createTask(ada, title)
    await expect(grace.getByText(title, { exact: true })).toBeVisible(LIVE)

    const renamed = unique('Renamed')
    await ada.getByRole('button', { name: `Editar ${title}` }).click()
    await ada.getByRole('textbox', { name: `Título de ${title}` }).fill(renamed)
    await ada.getByRole('button', { name: 'Guardar' }).click()
    await expect(grace.getByText(renamed, { exact: true })).toBeVisible(LIVE)

    await rowOf(ada, renamed)
      .getByRole('button', { name: 'Take', exact: true })
      .click()
    await expect(rowOf(grace, renamed).getByText('Ada Lovelace')).toBeVisible(
      LIVE,
    )
    await expect(statusOf(grace, renamed)).toHaveValue('in_progress', LIVE)

    await statusOf(ada, renamed).selectOption('done')
    await expect(statusOf(grace, renamed)).toHaveValue('done', LIVE)
    await expect(rowOf(grace, renamed).getByText('Ada Lovelace')).toBeHidden(
      LIVE,
    )

    await ada.getByRole('button', { name: `Borrar ${renamed}` }).click()
    await ada
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Borrar', exact: true })
      .click()
    await expect(grace.getByText(renamed, { exact: true })).toBeHidden(LIVE)
  })

  test('when both change a task, the last one wins and both see it within 5 s', async () => {
    const title = unique('Contested')
    await createTask(ada, title)
    await expect(grace.getByText(title, { exact: true })).toBeVisible(LIVE)

    const savedByAda = ada.waitForResponse(
      (response) => response.request().method() === 'PATCH',
    )
    await statusOf(ada, title).selectOption('done')
    await savedByAda

    const savedByGrace = grace.waitForResponse(
      (response) => response.request().method() === 'PATCH',
    )
    await statusOf(grace, title).selectOption('in_progress')
    await savedByGrace

    for (const page of [ada, grace]) {
      await expect(statusOf(page, title)).toHaveValue('in_progress', LIVE)
      await expect(rowOf(page, title).getByText('Grace Hopper')).toBeVisible(
        LIVE,
      )
    }
  })

  test('text being edited survives the refreshes', async () => {
    const title = unique('Being edited')
    await createTask(ada, title)
    await expect(grace.getByText(title, { exact: true })).toBeVisible(LIVE)

    await grace.getByRole('button', { name: `Editar ${title}` }).click()
    const field = grace.getByRole('textbox', { name: `Título de ${title}` })
    await field.fill('Half typed')

    // Longer than two refreshes.
    await grace.waitForTimeout(6500)

    await expect(field).toHaveValue('Half typed')
    await expect(field).toBeFocused()
  })
})
