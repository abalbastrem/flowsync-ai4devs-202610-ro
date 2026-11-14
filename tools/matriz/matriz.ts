// Matriz de trazabilidad: cruza los escenarios de OpenSpec con los resultados de los tests.
//
//   node tools/matriz/matriz.ts [--raiz <dir>] [--check]
//
// Sin --check escribe docs/trazabilidad/matriz.md (sin estado, se versiona) y
// docs/trazabilidad/estado.json (con estado, para la vista viva). Con --check no escribe
// nada y sale con error si hay tests sin escenario, escenarios sin test, con tests que
// fallan o solo omitidos, resultados que faltan, o si matriz.md no está al día.
// Por qué y cómo: docs/adr/0002-matriz-de-trazabilidad.md.

import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

type EstadoTest = 'pasa' | 'falla' | 'omitido'
type EstadoEscenario = EstadoTest | 'sin-test'

export type Test = { runner: string; nivel: string; archivo: string; titulo: string; estado: EstadoTest }
export type Escenario = {
  id: string
  nombre: string
  capability: string
  requisito: string
  origen: string
  estado: EstadoEscenario
  tests: Test[]
}
export type Resultado = {
  escenarios: Escenario[]
  huerfanos: Test[]
  faltanResultados: string[]
  errores: string[]
  markdown: string
}

type Config = { resultados: { runner: string; ruta: string }[] }
type EscenarioSpec = Omit<Escenario, 'estado' | 'tests'>

const RUTA_MATRIZ = 'docs/trazabilidad/matriz.md'
const RUTA_ESTADO = 'docs/trazabilidad/estado.json'
const RUTA_CONFIG = 'docs/trazabilidad/config.json'
// Un ID por escenario, único en todo el repo: SC-1, SC-2… La capability y el requisito
// son columnas propias de la matriz, así que el ID no los repite.
const ID_EN_TITULO = /\bSC-\d+\b/g

const aPosix = (ruta: string) => ruta.split(sep).join('/').replace(/\\/g, '/')

// ---------- Specs ----------

function specsDe(dir: string): { capability: string; ruta: string }[] {
  if (!existsSync(dir)) return []
  const out: { capability: string; ruta: string }[] = []
  const visitar = (actual: string) => {
    for (const e of readdirSync(actual, { withFileTypes: true })) {
      const ruta = join(actual, e.name)
      if (e.isDirectory()) visitar(ruta)
      else if (e.name === 'spec.md') out.push({ capability: aPosix(relative(dir, actual)), ruta })
    }
  }
  visitar(dir)
  return out
}

type Bloque = { seccion: string; requisito: string; escenarios: { id: string | null; nombre: string }[] }

function leerSpec(ruta: string): Bloque[] {
  const bloques: Bloque[] = []
  let seccion = 'MAIN'
  let actual: Bloque | null = null
  for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const delta = linea.match(/^## (ADDED|MODIFIED|REMOVED|RENAMED) Requirements/)
    if (delta) {
      seccion = delta[1]
      actual = null
      continue
    }
    const req = linea.match(/^### Requirement:\s*(.+?)\s*$/)
    if (req) {
      actual = { seccion, requisito: req[1], escenarios: [] }
      bloques.push(actual)
      continue
    }
    const esc = linea.match(/^#### Scenario:\s*(.+?)\s*$/)
    if (esc && actual) {
      const conId = esc[1].match(/^\[(SC-\d+)\]\s*(.*)$/)
      actual.escenarios.push(conId ? { id: conId[1], nombre: conId[2] } : { id: null, nombre: esc[1] })
    }
  }
  return bloques
}

function leerEscenarios(raiz: string, errores: string[]): EscenarioSpec[] {
  const porRequisito = new Map<string, EscenarioSpec[]>()
  const clave = (cap: string, req: string) => `${cap}\u0000${req}`
  const vistos = new Set<string>()

  const validar = (id: string | null, nombre: string, donde: string): id is string => {
    if (!id) {
      errores.push(`Escenario sin ID en ${donde}: «${nombre}». Añade [SC-n] al título, con el siguiente número libre.`)
      return false
    }
    return true
  }

  for (const { capability, ruta } of specsDe(join(raiz, 'openspec/specs'))) {
    const donde = aPosix(relative(raiz, ruta))
    for (const b of leerSpec(ruta)) {
      const lista: EscenarioSpec[] = []
      for (const e of b.escenarios) {
        if (!validar(e.id, e.nombre, donde)) continue
        if (vistos.has(e.id)) errores.push(`ID repetido: ${e.id} (${donde}).`)
        vistos.add(e.id)
        lista.push({ id: e.id, nombre: e.nombre, capability, requisito: b.requisito, origen: 'spec' })
      }
      porRequisito.set(clave(capability, b.requisito), lista)
    }
  }

  const dirChanges = join(raiz, 'openspec/changes')
  const changes = existsSync(dirChanges)
    ? readdirSync(dirChanges, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== 'archive').map((d) => d.name).sort()
    : []
  for (const change of changes) {
    const origen = `change: ${change}`
    for (const { capability, ruta } of specsDe(join(dirChanges, change, 'specs'))) {
      const donde = aPosix(relative(raiz, ruta))
      for (const b of leerSpec(ruta)) {
        const k = clave(capability, b.requisito)
        if (b.seccion === 'REMOVED') {
          porRequisito.delete(k)
          continue
        }
        if (b.seccion !== 'ADDED' && b.seccion !== 'MODIFIED') continue
        const previos = new Set((porRequisito.get(k) ?? []).map((e) => e.id))
        const lista: EscenarioSpec[] = []
        for (const e of b.escenarios) {
          if (!validar(e.id, e.nombre, donde)) continue
          if (vistos.has(e.id) && !(b.seccion === 'MODIFIED' && previos.has(e.id))) {
            errores.push(`ID repetido: ${e.id} (${donde}).`)
          }
          vistos.add(e.id)
          lista.push({ id: e.id, nombre: e.nombre, capability, requisito: b.requisito, origen })
        }
        porRequisito.set(k, lista)
      }
    }
  }

  return [...porRequisito.values()].flat()
}

// ---------- Resultados ----------

function leerJapa(texto: string): Test[] {
  const tests: Test[] = []
  let suite = ''
  for (const linea of texto.split(/\r?\n/)) {
    if (!linea.startsWith('{')) continue
    let ev: Record<string, any>
    try {
      ev = JSON.parse(linea)
    } catch {
      continue
    }
    if (ev.event === 'suite:start') suite = ev.name
    if (ev.event !== 'test:end') continue
    const estado: EstadoTest = ev.isSkipped || ev.isTodo ? 'omitido' : (ev.errors ?? []).length ? 'falla' : 'pasa'
    tests.push({
      runner: 'japa',
      nivel: suite === 'unit' ? 'unitario' : 'interfaz pública',
      archivo: aPosix(`backend/${ev.relativePath ?? ''}`),
      titulo: ev.title?.expanded ?? ev.title?.original ?? '',
      estado,
    })
  }
  return tests
}

function leerVitest(texto: string, raiz: string, errores: string[]): Test[] {
  const informe = JSON.parse(texto)
  const tests: Test[] = []
  for (const archivo of informe.testResults ?? []) {
    const ruta = aPosix(relative(raiz, archivo.name))
    if (archivo.status === 'failed' && !(archivo.assertionResults ?? []).length) {
      errores.push(`vitest no pudo ejecutar ${ruta}: ${String(archivo.message ?? '').split('\n')[0]}`)
    }
    for (const a of archivo.assertionResults ?? []) {
      const estado: EstadoTest = a.status === 'passed' ? 'pasa' : a.status === 'failed' ? 'falla' : 'omitido'
      tests.push({ runner: 'vitest', nivel: 'componente', archivo: ruta, titulo: a.title, estado })
    }
  }
  return tests
}

// ---------- Matriz ----------

const celda = (s: string) => s.replace(/\|/g, '\\|')

function markdown(escenarios: Escenario[], huerfanos: Test[]): string {
  const l: string[] = [
    '# Matriz de trazabilidad',
    '',
    `<!-- Generado por tools/matriz/matriz.ts: no se edita a mano. -->`,
    '',
    'Relación entre los escenarios de OpenSpec y los tests que los verifican. El estado de cada test no se versiona: lo pinta la vista viva (`make matriz-viva`). Por qué y cómo: [ADR 0002](../adr/0002-matriz-de-trazabilidad.md).',
    '',
  ]
  l.push('| Capability | Requisito | Escenario | Tests |', '|---|---|---|---|')
  const caps = [...new Set(escenarios.map((e) => e.capability))].sort()
  for (const cap of caps) {
    for (const e of escenarios.filter((x) => x.capability === cap)) {
      const enCurso = e.origen === 'spec' ? '' : ` _(${e.origen})_`
      const tests = e.tests.length
        ? e.tests.map((t) => `${celda(t.titulo)} (${t.nivel}, \`${t.archivo}\`)`).join('<br>')
        : '—'
      l.push(`| ${cap} | ${celda(e.requisito)} | ${e.id} · ${celda(e.nombre)}${enCurso} | ${tests} |`)
    }
  }
  l.push('', '## Tests sin escenario', '')
  if (huerfanos.length) {
    for (const t of huerfanos) l.push(`- ${t.titulo} (${t.nivel}, \`${t.archivo}\`)`)
  } else {
    l.push('Ninguno.')
  }
  return l.join('\n') + '\n'
}

export function generar(raiz: string): Resultado {
  const errores: string[] = []
  const config: Config = JSON.parse(readFileSync(join(raiz, RUTA_CONFIG), 'utf8'))
  const specs = leerEscenarios(raiz, errores)

  const tests: Test[] = []
  const faltanResultados: string[] = []
  for (const { runner, ruta } of config.resultados) {
    const archivo = join(raiz, ruta)
    const texto = existsSync(archivo) ? readFileSync(archivo, 'utf8').trim() : ''
    if (!texto) {
      faltanResultados.push(`${runner} (${ruta})`)
      continue
    }
    if (runner === 'japa') tests.push(...leerJapa(texto))
    else if (runner === 'vitest') tests.push(...leerVitest(texto, raiz, errores))
    else errores.push(`Runner desconocido en ${RUTA_CONFIG}: ${runner}.`)
  }

  const ids = new Set(specs.map((e) => e.id))
  const porId = new Map<string, Test[]>()
  const huerfanos: Test[] = []
  for (const t of tests) {
    const suyos = [...new Set(t.titulo.match(ID_EN_TITULO) ?? [])]
    if (!suyos.length || suyos.some((id) => !ids.has(id))) huerfanos.push(t)
    for (const id of suyos.filter((id) => ids.has(id))) porId.set(id, [...(porId.get(id) ?? []), t])
  }

  const escenarios: Escenario[] = specs.map((e) => {
    const suyos = porId.get(e.id) ?? []
    const estado: EstadoEscenario = !suyos.length
      ? 'sin-test'
      : suyos.some((t) => t.estado === 'falla')
        ? 'falla'
        : suyos.some((t) => t.estado === 'pasa')
          ? 'pasa'
          : 'omitido'
    return { ...e, estado, tests: suyos }
  })

  return { escenarios, huerfanos, faltanResultados, errores, markdown: markdown(escenarios, huerfanos) }
}

export function problemas(raiz: string, r: Resultado): string[] {
  const p: string[] = []
  const lista = (estado: EstadoEscenario) => r.escenarios.filter((e) => e.estado === estado).map((e) => e.id)
  if (lista('sin-test').length) p.push(`Escenarios sin test: ${lista('sin-test').join(', ')}`)
  if (lista('falla').length) p.push(`Escenarios con tests que fallan: ${lista('falla').join(', ')}`)
  if (lista('omitido').length) p.push(`Escenarios con solo tests omitidos: ${lista('omitido').join(', ')}`)
  for (const t of r.huerfanos) p.push(`Test sin escenario: «${t.titulo}» (${t.archivo})`)
  for (const f of r.faltanResultados) p.push(`Faltan resultados de ${f}: ejecuta make test`)
  const ruta = join(raiz, RUTA_MATRIZ)
  if (!existsSync(ruta) || readFileSync(ruta, 'utf8') !== r.markdown) {
    p.push(`${RUTA_MATRIZ} no está al día: ejecuta make matriz y haz commit`)
  }
  return p
}

export function escribir(raiz: string, r: Resultado): void {
  mkdirSync(join(raiz, 'docs/trazabilidad'), { recursive: true })
  writeFileSync(join(raiz, RUTA_MATRIZ), r.markdown)
  const { markdown: _md, ...estado } = r
  writeFileSync(join(raiz, RUTA_ESTADO), JSON.stringify({ generado: new Date().toISOString(), ...estado }, null, 2))
}

function main(argv: string[]): number {
  const i = argv.indexOf('--raiz')
  const raiz = resolve(i >= 0 ? argv[i + 1] : process.cwd())
  const check = argv.includes('--check')
  const r = generar(raiz)

  if (r.errores.length) {
    for (const e of r.errores) console.error(`✖ ${e}`)
    return 1
  }
  if (check) {
    const p = problemas(raiz, r)
    for (const x of p) console.error(`✖ ${x}`)
    if (p.length) return 1
    console.log(`✔ Matriz en verde: ${r.escenarios.length} escenarios, todos con tests que pasan.`)
    return 0
  }
  escribir(raiz, r)
  const cuenta = (estado: EstadoEscenario) => r.escenarios.filter((e) => e.estado === estado).length
  console.log(
    `Matriz generada: ${r.escenarios.length} escenarios (${cuenta('pasa')} en verde, ${cuenta('falla')} en rojo, ` +
      `${cuenta('sin-test')} sin test, ${cuenta('omitido')} omitidos), ${r.huerfanos.length} tests sin escenario.`,
  )
  for (const f of r.faltanResultados) console.log(`  · Sin resultados de ${f}.`)
  return 0
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2))
}
