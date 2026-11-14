import { expect, test } from '@playwright/test'
import { createTask, rowOf, signUp, uniqueTitle } from './helpers.ts'

// Story E2-1 · Crear una tarea con solo el título: happy path, end to end.
test('SC-17 SC-21 · con solo el título, la tarea aparece la primera de la lista sin recargar', async ({
  browser,
}) => {
  const page = await signUp(browser, 'Carla Ruiz')
  // A reload would wipe this marker.
  await page.evaluate(() => {
    ;(globalThis as unknown as { sinRecargar: boolean }).sinRecargar = true
  })

  const title = uniqueTitle('Revisar el contrato')
  await createTask(page, title)

  await expect(
    page.getByRole('list', { name: 'Tareas' }).getByRole('listitem').first(),
  ).toContainText(title)
  expect(
    await page.evaluate(
      () => (globalThis as unknown as { sinRecargar?: boolean }).sinRecargar,
    ),
  ).toBe(true)
  await expect(rowOf(page, title)).toHaveCount(1)
})
