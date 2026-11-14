import { expect, test } from '@playwright/test'
import { createTask, rowOf, signUp, uniqueTitle } from './helpers.ts'

// Story E3-1 · Lista compartida del equipo: happy path, end to end.
test('SC-2 SC-5 · lo que crea otra persona aparece en mi lista con título, responsable y estado', async ({
  browser,
}) => {
  const ana = await signUp(browser, 'Ana García')
  const title = uniqueTitle('Preparar la demo')
  await createTask(ana, title)
  await expect(rowOf(ana, title)).toBeVisible()

  const bruno = await signUp(browser, 'Bruno Díaz')

  const row = rowOf(bruno, title)
  await expect(row).toBeVisible()
  await expect(row).toContainText('Ana García')
  await expect(row).toContainText('Pendiente')
})
