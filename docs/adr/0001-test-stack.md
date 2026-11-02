# 0001. Stack de tests

**Estado:** aceptada · **Fecha:** 2026-11-01

## Contexto

La Definition of Done exige TDD: cada criterio G/W/T acaba cubierto por un test, escrito antes que el código. Hasta ahora el frontend no tenía runner de tests, y los tests del backend escribían en el mismo fichero SQLite que el servidor de desarrollo.

## Decisión

- **Backend:** Japa, que ya viene con AdonisJS. Los tests usan su propio fichero, `tmp/test.sqlite3`. Se migra al arrancar la suite, y cada grupo que escribe se aísla con `testUtils.db().withGlobalTransaction()`.
- **Frontend:** Vitest y Testing Library, con jsdom.
- **End to end:** Playwright, solo cuando una única sesión no pueda demostrar el comportamiento. Se instalará con la primera Story que lo necesite (FLOW-15).

## Por qué

- **Vitest** reutiliza la configuración de Vite: los alias y plugins son los mismos que en la app, sin mantener una segunda configuración como con Jest.
- **Testing Library** prueba lo que ve el usuario y no los detalles internos, que es la forma en que están escritos los G/W/T.
- **Un fichero SQLite propio** evita depender de la disciplina de cada test: aunque uno olvide aislarse, no puede tocar los datos de desarrollo.

## Consecuencias

- `npm test` funciona en `backend/` y en `frontend/`.
- La suite del backend solo pasa con la BD de tests migrada, y eso lo hace ella misma al arrancar.
- Sin Playwright, nada comprueba la app completa de punta a punta hasta FLOW-15. Desde entonces: `npm run test:e2e` en `frontend/`, con puertos y BD propios (`DB_FILE`).
