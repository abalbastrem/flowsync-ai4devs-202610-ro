// Tests de la CLI de la matriz de trazabilidad, por su interfaz pública: se monta un
// proyecto de prueba en una carpeta temporal, se ejecuta la CLI y se mira lo que escribe.
// Cada test cuelga de una decisión del plan aceptado (ADR 0002), indicada en el título.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const CLI = join(dirname(fileURLToPath(import.meta.url)), 'matriz.ts')

type Archivos = Record<string, string>

function proyecto(archivos: Archivos): string {
  const raiz = mkdtempSync(join(tmpdir(), 'matriz-'))
  const base: Archivos = {
    'docs/trazabilidad/config.json': JSON.stringify({
      prefijos: { 'task-list': 'TL', tasks: 'TA' },
      resultados: [
        { runner: 'japa', ruta: 'backend/tmp/resultados-tests.ndjson' },
        { runner: 'vitest', ruta: 'frontend/tmp/resultados-tests.json' },
      ],
    }),
    'backend/tmp/resultados-tests.ndjson': japa([]),
    'frontend/tmp/resultados-tests.json': vitest([]),
  }
  for (const [ruta, contenido] of Object.entries({ ...base, ...archivos })) {
    mkdirSync(dirname(join(raiz, ruta)), { recursive: true })
    writeFileSync(join(raiz, ruta), contenido)
  }
  return raiz
}

function spec(requisitos: Record<string, string[]>): string {
  let md = '# Spec\n\n## Purpose\n\nPrueba.\n\n## Requirements\n\n'
  for (const [req, escenarios] of Object.entries(requisitos)) {
    md += `### Requirement: ${req}\n\nEl sistema SHALL hacerlo.\n\n`
    for (const e of escenarios) md += `#### Scenario: ${e}\n\n- **WHEN** algo\n- **THEN** otra cosa\n\n`
  }
  return md
}

type TestJapa = { titulo: string; falla?: boolean; omitido?: boolean; suite?: string }
function japa(tests: TestJapa[]): string {
  const lineas = ['[ info ] booting application to run tests...']
  let suite = ''
  for (const t of tests) {
    if ((t.suite ?? 'functional') !== suite) {
      suite = t.suite ?? 'functional'
      lineas.push(JSON.stringify({ event: 'suite:start', name: suite }))
    }
    lineas.push(
      JSON.stringify({
        event: 'test:end',
        relativePath: 'tests\\functional\\tasks\\list.spec.ts',
        title: { original: t.titulo, expanded: t.titulo },
        errors: t.falla ? [{ phase: 'test', error: { message: 'boom' } }] : [],
        ...(t.omitido ? { isSkipped: true } : {}),
      }),
    )
  }
  return lineas.join('\n') + '\n'
}

type TestVitest = { titulo: string; estado?: 'passed' | 'failed' | 'skipped' | 'todo' }
function vitest(tests: TestVitest[]): string {
  return JSON.stringify({
    testResults: [
      {
        name: 'C:/repo/frontend/src/pages/task-list.test.tsx',
        status: 'passed',
        assertionResults: tests.map((t) => ({
          ancestorTitles: ['Grupo'],
          title: t.titulo,
          status: t.estado ?? 'passed',
        })),
      },
    ],
  })
}

function ejecutar(raiz: string, ...args: string[]) {
  const r = spawnSync(process.execPath, [CLI, '--raiz', raiz, ...args], { encoding: 'utf8' })
  return { codigo: r.status, salida: (r.stdout ?? '') + (r.stderr ?? '') }
}

function estado(raiz: string) {
  return JSON.parse(readFileSync(join(raiz, 'docs/trazabilidad/estado.json'), 'utf8'))
}

function escenario(raiz: string, id: string) {
  return estado(raiz).escenarios.find((e: { id: string }) => e.id === id)
}

const LISTA = { 'openspec/specs/task-list/spec.md': spec({ 'La lista es compartida': ['[TL-1] Dos personas ven lo mismo', '[TL-2] Sin permisos especiales'] }) }

test('estados · un escenario sin ningún test queda en «sin-test»', () => {
  const raiz = proyecto(LISTA)
  assert.equal(ejecutar(raiz).codigo, 0)
  assert.equal(escenario(raiz, 'TL-1').estado, 'sin-test')
})

test('estados · un escenario con todos sus tests en verde queda en «pasa»', () => {
  const raiz = proyecto({ ...LISTA, 'backend/tmp/resultados-tests.ndjson': japa([{ titulo: 'TL-1 · dos personas reciben lo mismo' }]) })
  ejecutar(raiz)
  const e = escenario(raiz, 'TL-1')
  assert.equal(e.estado, 'pasa')
  assert.equal(e.tests[0].nivel, 'interfaz pública')
})

test('estados · basta un test que falla para que el escenario quede en «falla»', () => {
  const raiz = proyecto({
    ...LISTA,
    'backend/tmp/resultados-tests.ndjson': japa([{ titulo: 'TL-1 · por la API' }]),
    'frontend/tmp/resultados-tests.json': vitest([{ titulo: 'TL-1 · en pantalla', estado: 'failed' }]),
  })
  ejecutar(raiz)
  assert.equal(escenario(raiz, 'TL-1').estado, 'falla')
})

test('estados · un escenario con solo tests omitidos queda en «omitido»', () => {
  const raiz = proyecto({
    ...LISTA,
    'backend/tmp/resultados-tests.ndjson': japa([{ titulo: 'TL-1 · pendiente', omitido: true }]),
    'frontend/tmp/resultados-tests.json': vitest([{ titulo: 'TL-2 · por hacer', estado: 'todo' }]),
  })
  ejecutar(raiz)
  assert.equal(escenario(raiz, 'TL-1').estado, 'omitido')
  assert.equal(escenario(raiz, 'TL-2').estado, 'omitido')
})

test('niveles · el nivel sale del runner y de la suite', () => {
  const raiz = proyecto({
    ...LISTA,
    'backend/tmp/resultados-tests.ndjson': japa([
      { titulo: 'TL-1 · por la API' },
      { titulo: 'TL-1 · lógica', suite: 'unit' },
    ]),
    'frontend/tmp/resultados-tests.json': vitest([{ titulo: 'TL-1 · en pantalla' }]),
  })
  ejecutar(raiz)
  const niveles = escenario(raiz, 'TL-1').tests.map((t: { nivel: string }) => t.nivel).sort()
  assert.deepEqual(niveles, ['componente', 'interfaz pública', 'unitario'])
})

test('cruce · un test con dos IDs cubre los dos escenarios', () => {
  const raiz = proyecto({ ...LISTA, 'backend/tmp/resultados-tests.ndjson': japa([{ titulo: 'TL-1 TL-2 · lista compartida y sin permisos' }]) })
  ejecutar(raiz)
  assert.equal(escenario(raiz, 'TL-1').estado, 'pasa')
  assert.equal(escenario(raiz, 'TL-2').estado, 'pasa')
})

test('huérfanos · un test sin ID y uno con un ID inexistente son tests sin escenario', () => {
  const raiz = proyecto({
    ...LISTA,
    'backend/tmp/resultados-tests.ndjson': japa([{ titulo: 'responde 201' }, { titulo: 'TL-99 · no existe' }]),
  })
  ejecutar(raiz)
  const titulos = estado(raiz).huerfanos.map((t: { titulo: string }) => t.titulo).sort()
  assert.deepEqual(titulos, ['TL-99 · no existe', 'responde 201'])
})

test('specs · un ID repetido es un error', () => {
  const raiz = proyecto({ 'openspec/specs/task-list/spec.md': spec({ R: ['[TL-1] Uno', '[TL-1] Otro'] }) })
  const r = ejecutar(raiz)
  assert.notEqual(r.codigo, 0)
  assert.match(r.salida, /TL-1/)
})

test('specs · un escenario sin ID es un error', () => {
  const raiz = proyecto({ 'openspec/specs/task-list/spec.md': spec({ R: ['Sin identificador'] }) })
  const r = ejecutar(raiz)
  assert.notEqual(r.codigo, 0)
  assert.match(r.salida, /Sin identificador/)
})

test('specs · un ID con el prefijo de otra capability es un error', () => {
  const raiz = proyecto({ 'openspec/specs/task-list/spec.md': spec({ R: ['[TA-1] Prefijo ajeno'] }) })
  const r = ejecutar(raiz)
  assert.notEqual(r.codigo, 0)
  assert.match(r.salida, /TA-1/)
})

test('specs · una capability sin prefijo registrado es un error', () => {
  const raiz = proyecto({ 'openspec/specs/nueva/spec.md': spec({ R: ['[NU-1] Algo'] }) })
  const r = ejecutar(raiz)
  assert.notEqual(r.codigo, 0)
  assert.match(r.salida, /nueva/)
})

test('changes · un change en curso añade sus escenarios y sustituye los del requisito que modifica', () => {
  const delta =
    '## ADDED Requirements\n\n### Requirement: Filtrar\n\nSHALL.\n\n#### Scenario: [TL-3] Por estado\n\n- **WHEN** a\n- **THEN** b\n\n' +
    '## MODIFIED Requirements\n\n### Requirement: La lista es compartida\n\nSHALL.\n\n#### Scenario: [TL-1] Dos personas ven lo mismo, también filtrado\n\n- **WHEN** a\n- **THEN** b\n'
  const raiz = proyecto({
    ...LISTA,
    'openspec/changes/filtro/specs/task-list/spec.md': delta,
    'openspec/changes/archive/2026-01-01-viejo/specs/task-list/spec.md': '## ADDED Requirements\n\n### Requirement: X\n\nSHALL.\n\n#### Scenario: [TL-50] Archivado\n\n- **WHEN** a\n- **THEN** b\n',
  })
  ejecutar(raiz)
  const ids = estado(raiz).escenarios.map((e: { id: string }) => e.id).sort()
  assert.deepEqual(ids, ['TL-1', 'TL-3'])
  assert.equal(escenario(raiz, 'TL-3').origen, 'change: filtro')
  assert.equal(escenario(raiz, 'TL-1').nombre, 'Dos personas ven lo mismo, también filtrado')
})

test('matriz.md · lista escenarios y tests con su nivel, sin estado', () => {
  const raiz = proyecto({ ...LISTA, 'backend/tmp/resultados-tests.ndjson': japa([{ titulo: 'TL-1 · por la API', falla: true }]) })
  ejecutar(raiz)
  const md = readFileSync(join(raiz, 'docs/trazabilidad/matriz.md'), 'utf8')
  assert.match(md, /TL-1/)
  assert.match(md, /TL-1 · por la API/)
  assert.match(md, /interfaz pública/)
  assert.doesNotMatch(md, /falla|pasa|sin-test/)
})

test('--check · bloquea si hay escenarios sin test', () => {
  const raiz = proyecto(LISTA)
  ejecutar(raiz)
  const r = ejecutar(raiz, '--check')
  assert.notEqual(r.codigo, 0)
  assert.match(r.salida, /TL-1/)
})

test('--check · bloquea si hay tests que fallan', () => {
  const raiz = proyecto({ ...LISTA, 'backend/tmp/resultados-tests.ndjson': japa([{ titulo: 'TL-1 TL-2 · todo', falla: true }]) })
  ejecutar(raiz)
  const r = ejecutar(raiz, '--check')
  assert.notEqual(r.codigo, 0)
  assert.match(r.salida, /fallan.*TL-1|TL-1.*fallan/s)
})

test('--check · bloquea si hay tests sin escenario', () => {
  const raiz = proyecto({ ...LISTA, 'backend/tmp/resultados-tests.ndjson': japa([{ titulo: 'TL-1 TL-2 · todo' }, { titulo: 'sin ID' }]) })
  ejecutar(raiz)
  const r = ejecutar(raiz, '--check')
  assert.notEqual(r.codigo, 0)
  assert.match(r.salida, /sin ID/)
})

test('--check · bloquea si hay escenarios con solo tests omitidos', () => {
  const raiz = proyecto({ ...LISTA, 'backend/tmp/resultados-tests.ndjson': japa([{ titulo: 'TL-1 TL-2 · todo', omitido: true }]) })
  ejecutar(raiz)
  const r = ejecutar(raiz, '--check')
  assert.notEqual(r.codigo, 0)
  assert.match(r.salida, /omitidos.*TL-1|TL-1.*omitidos/s)
})

test('--check · bloquea si matriz.md no está al día', () => {
  const raiz = proyecto({ ...LISTA, 'backend/tmp/resultados-tests.ndjson': japa([{ titulo: 'TL-1 TL-2 · todo' }]) })
  const r = ejecutar(raiz, '--check')
  assert.notEqual(r.codigo, 0)
  assert.match(r.salida, /matriz\.md/)
})

test('--check · pasa con todo en verde y matriz.md al día, sin reescribir nada', () => {
  const raiz = proyecto({ ...LISTA, 'backend/tmp/resultados-tests.ndjson': japa([{ titulo: 'TL-1 TL-2 · todo' }]) })
  ejecutar(raiz)
  const antes = readFileSync(join(raiz, 'docs/trazabilidad/matriz.md'), 'utf8')
  const r = ejecutar(raiz, '--check')
  assert.equal(r.codigo, 0, r.salida)
  assert.equal(readFileSync(join(raiz, 'docs/trazabilidad/matriz.md'), 'utf8'), antes)
})

test('resultados · si falta el archivo de un runner, --check lo dice y bloquea', () => {
  const raiz = proyecto(LISTA)
  writeFileSync(join(raiz, 'frontend/tmp/resultados-tests.json'), '')
  const r = ejecutar(raiz, '--check')
  assert.notEqual(r.codigo, 0)
  assert.match(r.salida, /vitest/)
})

test('resultados · sin archivo de resultados, la matriz se genera igual, toda en gris', () => {
  const raiz = proyecto(LISTA)
  for (const r of ['backend/tmp/resultados-tests.ndjson', 'frontend/tmp/resultados-tests.json']) writeFileSync(join(raiz, r), '')
  assert.equal(ejecutar(raiz).codigo, 0)
  assert.ok(existsSync(join(raiz, 'docs/trazabilidad/matriz.md')))
  assert.equal(escenario(raiz, 'TL-2').estado, 'sin-test')
})
