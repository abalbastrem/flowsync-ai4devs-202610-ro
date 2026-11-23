# Capability `tasks`

El ciclo de vida de una tarea: cómo se crea, con qué valores nace y qué estados puede tener. Hoy solo cubre la creación. Cambiar de estado, editar, reasignar o borrar llegarán con sus historias (ver «Qué falta»).

Este README no repite el comportamiento ni la forma de la API, que tienen su propia fuente:

| Qué | Dónde |
|---|---|
| Comportamiento (requisitos y escenarios `SC-17`…`SC-28`) | [`spec.md`](./spec.md) |
| Forma de cada endpoint | Documento OpenAPI en `http://localhost:3333/api`, **solo en desarrollo** e incompleto: no describe cuerpos ni respuestas, y dice `security: []` aunque las rutas piden sesión. No es un contrato ([claude-config#31](https://github.com/abalbastrem/claude-config/issues/31)) |
| La lista donde se ven las tareas | Capability vecina [`task-list`](../task-list/spec.md) |
| Historias de origen | [E2-1](../../../docs/backlog/E2-gestion-tareas/us-crear-tarea.md) (crear con solo el título) y [E2-3](../../../docs/backlog/E2-gestion-tareas/us-responsable-y-estado-por-defecto.md) (nace mía y pendiente) |
| Decisiones técnicas | [`design.md` del change `lista-compartida`](../../changes/archive/2026-11-10-lista-compartida/design.md) |

## Recorrido

Cómo se combinan las llamadas, que el OpenAPI describe por separado:

1. **Sesión.** `POST /api/v1/auth/login` devuelve un token. Las dos rutas de tareas lo piden en `Authorization: Bearer <token>`; sin él responden 401.
2. **Crear.** `POST /api/v1/tasks` con `{ "title": "…" }`. El servidor pone el responsable (quien llama) y el estado (`pending`), y responde 201 con la tarea dentro de `{ data }`.
3. **Ver.** `GET /api/v1/tasks` (capability `task-list`) devuelve todas las tareas del espacio, la más reciente primero. La recién creada sale con el mismo responsable y estado.

En la pantalla (`/`, tras iniciar sesión), el formulario solo tiene el título. La tarea creada se pone al principio de la lista sin volver a pedirla. Si la lista aún no había cargado, se pide entera, para que una carga lenta no borre la tarea nueva (`SC-28`).

## Por qué así

- **Solo el título.** Anotar en qué andas tiene que costar segundos. Por eso el responsable y el estado no se piden ni se aceptan: el validador solo admite `title`, y cualquier otro campo del cuerpo se ignora.
- **Tres estados fijos, sin tabla de estados.** Se guardan como valores internos (`pending`, `in_progress`, `done`) y el frontend los traduce a «Pendiente», «En curso» y «Hecho». Una tabla haría pensar que se pueden configurar, y el producto lo prohíbe.
- **Sin `creator_id`.** Hoy autor y responsable coinciden. Cuando se pueda reasignar, nada pide recordar quién creó la tarea.
- **Del responsable solo viajan `id`, `fullName` e `initials`.** Nunca el email. El `id` sirve para comparar en el cliente; la pantalla no lo muestra.

## Dónde está el código

| Capa | Ficheros |
|---|---|
| Datos | `backend/database/migrations/*_create_tasks_table.ts`, `backend/app/models/task.ts` |
| API | `backend/app/controllers/tasks_controller.ts`, `backend/app/validators/task.ts`, `backend/app/transformers/task_transformer.ts` |
| Cliente | `frontend/src/lib/api.ts` (`createTask`, `listTasks`), `frontend/src/lib/types.ts` (`Task`), `frontend/src/lib/task-status.ts` (etiquetas de los estados) |
| Pantalla | `frontend/src/pages/tasks-page.tsx`, `frontend/src/components/task-row.tsx` |
| Tests | `backend/tests/functional/tasks/`, `frontend/src/pages/tasks-page.test.tsx`, `frontend/e2e/crear-tarea.spec.ts`, `frontend/e2e/responsable-y-estado.spec.ts` |

La matriz [`docs/trazabilidad/matrix.md`](../../../docs/trazabilidad/matrix.md) cruza cada escenario con sus tests.

## Qué falta

- **Reglas del título** (vacío, longitud): [E2-2](../../../docs/backlog/E2-gestion-tareas/us-titulo-obligatorio.md). Hoy solo se exige que `title` sea un texto.
- **Cambiar el estado:** [E2-4](../../../docs/backlog/E2-gestion-tareas/us-cambiar-estado.md). Los tres estados existen, pero toda tarea se queda en «Pendiente».
- **Abrir, editar el título, reasignar y borrar:** [E2-5](../../../docs/backlog/E2-gestion-tareas/us-abrir-tarea.md), [E2-6](../../../docs/backlog/E2-gestion-tareas/us-editar-titulo.md), [E2-7](../../../docs/backlog/E2-gestion-tareas/us-reasignar-responsable.md) y [E2-10](../../../docs/backlog/E2-gestion-tareas/us-borrar-tarea.md).
- **Fecha de vencimiento:** [FS-118](../../../docs/backlog/E2-gestion-tareas/us-fechas-vencimiento.md).
