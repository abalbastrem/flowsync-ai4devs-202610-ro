import { expect, test } from '@playwright/test'
import { createTask, rowOf, signUp, uniqueTitle } from './helpers.ts'

// Story E2-3 · Responsable y estado por defecto: happy path, end to end.
test('SC-22 SC-24 · la tarea creada sale a mi nombre y en «Pendiente»', async ({
  browser,
}) => {
  const page = await signUp(browser, 'Diego López')

  const title = uniqueTitle('Llamar al proveedor')
  await createTask(page, title)

  const row = rowOf(page, title)
  await expect(row).toContainText('Diego López')
  await expect(row).toContainText('Pendiente')
})
