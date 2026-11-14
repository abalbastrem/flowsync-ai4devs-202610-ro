// Tests del servidor de la vista viva, por HTTP: se arranca contra un proyecto de prueba
// en una carpeta temporal y se comprueba lo que sirve y lo que empuja por SSE.
// Cuelgan de la decisión del plan aceptado (ADR 0002): la vista se repinta sola al
// terminar cada ejecución, sin recargar la página.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { arrancar } from './servidor.ts'

function proyecto(): string {
  const raiz = mkdtempSync(join(tmpdir(), 'matriz-servidor-'))
  const archivos: Record<string, string> = {
    'docs/trazabilidad/config.json': JSON.stringify({
      resultados: [{ runner: 'japa', ruta: 'backend/tmp/resultados-tests.ndjson' }],
    }),
    'docs/trazabilidad/index.html': '<!doctype html><title>Matriz de trazabilidad</title>',
    'openspec/specs/task-list/spec.md':
      '# Spec\n\n## Requirements\n\n### Requirement: R\n\nSHALL.\n\n#### Scenario: [SC-1] Uno\n\n- **WHEN** a\n- **THEN** b\n',
    'backend/tmp/resultados-tests.ndjson': '',
  }
  for (const [ruta, contenido] of Object.entries(archivos)) {
    mkdirSync(dirname(join(raiz, ruta)), { recursive: true })
    writeFileSync(join(raiz, ruta), contenido)
  }
  return raiz
}

const japaQuePasa = JSON.stringify({
  event: 'test:end',
  relativePath: 'tests/functional/x.spec.ts',
  title: { expanded: 'SC-1 · funciona' },
  errors: [],
})

test('vista · GET / sirve la página de la matriz', async () => {
  const s = await arrancar({ raiz: proyecto(), puerto: 0 })
  try {
    const r = await fetch(`http://localhost:${s.puerto}/`)
    assert.equal(r.status, 200)
    assert.match(r.headers.get('content-type') ?? '', /text\/html/)
    assert.match(await r.text(), /Matriz de trazabilidad/)
  } finally {
    await s.cerrar()
  }
})

test('vista · GET /estado devuelve el estado actual de la matriz', async () => {
  const s = await arrancar({ raiz: proyecto(), puerto: 0 })
  try {
    const estado = await (await fetch(`http://localhost:${s.puerto}/estado`)).json()
    assert.equal(estado.escenarios[0].id, 'SC-1')
    assert.equal(estado.escenarios[0].estado, 'sin-test')
  } finally {
    await s.cerrar()
  }
})

test('vista · al cambiar los resultados, empuja el estado nuevo por SSE sin que se recargue nada', async () => {
  const raiz = proyecto()
  const s = await arrancar({ raiz, puerto: 0 })
  const ac = new AbortController()
  try {
    const r = await fetch(`http://localhost:${s.puerto}/eventos`, { signal: ac.signal })
    assert.match(r.headers.get('content-type') ?? '', /text\/event-stream/)
    const lector = r.body!.getReader()
    const dec = new TextDecoder()

    let buffer = ''
    const siguiente = async (): Promise<any> => {
      while (!buffer.includes('\n\n')) {
        const { value, done } = await lector.read()
        if (done) throw new Error('el stream se cerró')
        buffer += dec.decode(value)
      }
      const [evento, ...resto] = buffer.split('\n\n')
      buffer = resto.join('\n\n')
      return JSON.parse(evento.replace(/^data: /m, ''))
    }

    assert.equal((await siguiente()).escenarios[0].estado, 'sin-test')
    writeFileSync(join(raiz, 'backend/tmp/resultados-tests.ndjson'), japaQuePasa + '\n')

    let estado = await siguiente()
    while (estado.escenarios[0].estado !== 'pasa') estado = await siguiente()
    assert.equal(estado.escenarios[0].estado, 'pasa')
  } finally {
    ac.abort()
    await s.cerrar()
  }
})
