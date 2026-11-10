# Design

## Context

Hoy el backend solo tiene cuentas y acceso: registro, login, perfil y logout bajo `/api/v1`, protegidos con `middleware.auth()` (guard `api`, tokens opacos). El frontend tiene login, registro y perfil, y cualquier ruta desconocida redirige a `/profile`. No existe ninguna noción de tarea.

Tampoco hay base de pruebas. El backend tiene Japa configurado (`tests/bootstrap.ts`, con las suites `unit` y `functional` en `adonisrc.ts`), pero ningún test. El frontend no tiene runner. Además, la conexión SQLite apunta a un solo archivo (`tmp/db.sqlite3`), compartido por los tests y el servidor de desarrollo.

El usuario puede registrarse sin nombre (`fullName` es nullable), y el modelo `User` ya calcula sus `initials` a partir del nombre o, si no hay, del email.

Las razones del change están en proposal.md (Why) y los requisitos en `specs/task-list` y `specs/tasks`.

## Goals / Non-Goals

**Goals:**
- Introducir la entidad tarea con su responsable y su estado, de forma que E2-4, E2-7 y FS-142 puedan crecer sobre ella sin rehacerla.
- Dejar la base de tests del backend y del frontend lista para los changes siguientes.

**Non-Goals:**
- Paginación de la lista: RNF-5 marca como techo unas 200 tareas, y se devuelven todas.
- Refresco automático de la lista (E3-2) y cualquier canal push.
- Tests E2E. Se valorarán cuando haya un recorrido que solo se pueda cubrir de punta a punta.

## Decisions

### Modelo de datos
Se añade una migración `tasks` con `id`, `title`, `status`, `assignee_id` (FK a `users`, no nula, y `ON DELETE` restringido: borrar usuarios no está en el MVP) y los timestamps. `status` se guarda como string con tres valores internos, `pending`, `in_progress` y `done`, y el frontend los traduce a «Pendiente», «En curso» y «Hecho».
- *Alternativa descartada:* una tabla de estados. Haría pensar que los estados se pueden configurar, justo lo que RF-8 prohíbe.
- *Alternativa descartada:* guardar las etiquetas en castellano. Acopla los datos a la presentación.

Siguiendo el flujo del proyecto, primero va la migración, luego `node ace migration:run` (que regenera `database/schema.ts`) y por último el modelo `Task`, que extiende el schema generado y solo añade la relación `belongsTo` con `User` como `assignee`.

No se guarda un `creator_id` aparte. Hoy el autor y el responsable coinciden, y cuando E2-7 permita reasignar, la spec no pide recordar quién creó la tarea. Si algún día hace falta, será otra migración.

### API
Dos rutas nuevas dentro del grupo `/api/v1` con `middleware.auth()`:
- `GET /api/v1/tasks` devuelve 200 con `{ data: Task[] }`, ordenado por `created_at` descendente y, en caso de empate, por `id` descendente, para que el orden sea estable.
- `POST /api/v1/tasks` recibe `{ title }` y devuelve 201 con `{ data: Task }`. El servidor fija `assignee_id` (usuario autenticado) y `status = pending`. Cualquier otro campo del cuerpo se ignora, porque el validador solo admite `title`.

Forma de `Task` en la respuesta, generada por un `TaskTransformer` nuevo:
`{ id, title, status, assignee: { id, fullName, initials } }`.
- Del responsable solo se exponen `id`, `fullName` e `initials`, siguiendo la nota de E3-1: no se devuelve el registro de usuario entero ni el email. El `id` sirve para comparar en el cliente (por ejemplo, en E2-7) y la UI no lo muestra.
- No se exponen `createdAt` ni `updatedAt`. La lista no muestra fechas (CA-7) y el orden ya lo da el servidor. Si E2-5 o FS-118 los necesitan, ya los añadirán.

Validador `createTaskValidator = vine.create({ title: vine.string().trim() })`. Las reglas de título vacío y de longitud son contrato de E2-2. Aquí solo se exige que `title` sea un string, porque es lo mínimo para que la tarea exista.

### Frontend
- Nueva página `TasksPage` en `/`, dentro de `ProtectedRoute`. El comodín `*` pasa a redirigir a `/` en vez de a `/profile`, de modo que la lista es la pantalla de entrada después del login. El perfil sigue disponible en `/profile`.
- En `src/lib/api.ts` se añaden `listTasks()` y `createTask(title)`, y el tipo `Task` va a `src/lib/types.ts`. Como dice el proyecto, ningún componente llama a `fetch` directamente.
- El formulario de alta tiene un solo campo, el título. Cuando la API confirma la creación, la tarea se inserta al principio del estado local, sin volver a pedir la lista (CA-3 de E2-1) y respetando el orden de «más reciente primero».
- El responsable se pinta con `assignee.fullName ?? assignee.initials`.
- Estado vacío: un texto que explica qué es la lista y el formulario de alta como llamada a la acción.
- Los componentes de UI se añaden con `npx shadcn@latest add <componente>` cuando hagan falta, y no se editan a mano.

### Tests
- **Backend, nivel API:** suite `functional` en `tests/functional/`, con `apiClient` y `loginAs` del plugin de auth, ambos ya registrados en `tests/bootstrap.ts`. Cada grupo aísla la base de datos con `testUtils.db().truncate()`, porque comparte archivo con el servidor de desarrollo. Los datos de partida se crean con los modelos (un usuario con nombre, otro sin nombre y tareas).
- **Frontend, nivel componente:** Vitest, Testing Library y jsdom, con la API simulada en el nivel de red mediante MSW. Así los tests pasan por `lib/api.ts` (desenvolver `{ data }`, adjuntar el token y traducir errores) en vez de sustituirlo. Se añade un script `npm test` al `package.json` del frontend.
  - *Alternativa descartada:* hacer `vi.mock('@/lib/api')`. Es más simple, pero deja sin probar la frontera con el backend.
- Esta elección afecta a todos los changes futuros del frontend, así que se registra como ADR: [docs/adr/0001-stack-de-tests-frontend.md](../../../docs/adr/0001-stack-de-tests-frontend.md), con una referencia corta en `CLAUDE.md` (en la sección de Frontend, donde hoy pone «No hay runner de tests instalado»).

## Risks / Trade-offs

- [Las iniciales salen del email cuando no hay nombre, así que una cuenta `x@dominio` se ve como «X»] → Se acepta. Es la decisión de producto tomada, y mostrar el email no es una opción.
- [Sin paginación] → Se acepta para el techo de RNF-5. Si se supera, habrá un change aparte.
- [Sin E2E, nadie comprueba que el frontend y el backend encajan de verdad] → La forma de `Task` se define en un solo sitio: el transformer en el backend y `types.ts` en el frontend. Los handlers de MSW reproducen esa forma, y si cambia hay que actualizar los dos lados. Esta es la primera candidata a un test E2E cuando haya una base E2E.
- [`truncate` en una base de datos compartida con desarrollo borra los datos locales del desarrollador al pasar los tests] → Se acepta de momento, porque es el comportamiento que el `CLAUDE.md` ya anticipa. Separar la base de datos de tests sería un change de infraestructura propio.

## Migration Plan

No hay datos en producción. `node ace migration:run` crea la tabla, y el rollback es `migration:rollback`.
