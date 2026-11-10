---
status: accepted
date: 2026-11-10
---

# 0001 — Tests de componente del frontend con Vitest, Testing Library y MSW

## Contexto y problema

El frontend no tenía runner de tests. La convención del proyecto es probar el frontend **por defecto a nivel de componente, con la API simulada**. El primer change que lo necesita es `lista-compartida`, y la elección condiciona todos los changes del frontend que vengan después.

La pregunta es doble: con qué se ejecutan los tests y **a qué altura se simula la API**.

## Factores de decisión

- Integrarse con Vite 8 sin una configuración paralela (alias `@`, plugin de React).
- Que los tests pasen por `src/lib/api.ts`, que es el único punto de contacto con el backend: desenvuelve `{ data }`, adjunta el token y traduce los errores. Un fallo ahí debe verse en los tests.
- Probar lo que una persona ve y hace, no la implementación del componente.

## Opciones consideradas

1. **Vitest, Testing Library, jsdom y MSW**: se simula la API a nivel de red (`fetch`).
2. **Vitest, Testing Library, jsdom y `vi.mock('@/lib/api')`**: se sustituyen las funciones del cliente.
3. **Jest y Testing Library**.

## Decisión

Opción 1: **Vitest, Testing Library, jsdom y MSW**.

### Consecuencias

- Bueno: los tests cubren `lib/api.ts` de verdad, incluida la traducción de errores y el desenvoltorio de `{ data }`.
- Bueno: Vitest reutiliza `vite.config.ts` mediante `mergeConfig`, sin duplicar alias ni plugins.
- Bueno: el servidor de MSW arranca con `onUnhandledFrame: 'error'`, así que una petición que el test no prevé lo hace fallar en lugar de pasar en silencio.
- Malo: hay que escribir los handlers con la forma exacta de las respuestas del backend. Si el backend cambia, hay que actualizarlos a mano, porque nada los sincroniza.
- Malo: es una dependencia más que mantener, frente a la opción 2.

### Confirmación

`npm test` en `frontend/` ejecuta los tests. La configuración está en `vitest.config.ts`, y el setup compartido en `src/test/` (`setup.ts` y `server.ts`).

## Pros y contras de las opciones

### Vitest, Testing Library, jsdom y MSW

- Bueno, porque prueba la frontera real con el backend, desde el componente hasta `fetch`.
- Bueno, porque los handlers son reutilizables entre tests y se leen como un contrato de la API.
- Malo, porque cuesta un poco más de montar.

### Vitest, Testing Library, jsdom y `vi.mock('@/lib/api')`

- Bueno, porque es la opción más simple: cada test decide qué devuelve cada función.
- Malo, porque `lib/api.ts` queda fuera de todos los tests de componente, y los errores de traducción o de desenvoltorio no se verían.
- Malo, porque los mocks acoplan los tests a los nombres de las funciones internas.

### Jest y Testing Library

- Bueno, porque es el estándar más conocido.
- Malo, porque necesita transformar TypeScript y ESM y duplicar los alias de Vite, que en un proyecto Vite es fricción sin beneficio.
