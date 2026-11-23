# Capability `tasks`

El ciclo de vida de una tarea: cómo se crea, con qué valores nace y qué estados puede tener. Hoy solo cubre la creación. Cambiar de estado, editar, reasignar o borrar llegarán con sus historias (ver «Qué falta»).

Este README no repite el comportamiento, la forma de la API ni las decisiones técnicas, que tienen su propia fuente:

| Qué | Dónde |
|---|---|
| Comportamiento (escenarios `SC-17`…`SC-25`, `SC-27` y `SC-28`) | [`spec.md`](./spec.md) |
| Forma de cada endpoint | Documento OpenAPI en `http://localhost:3333/api`, **solo en desarrollo** e incompleto: no describe cuerpos ni respuestas, y dice `security: []` aunque las rutas piden sesión. No es un contrato ([claude-config#31](https://github.com/abalbastrem/claude-config/issues/31)) |
| Decisiones técnicas (modelo de datos, API, frontend, tests) | [`design.md` del change `lista-compartida`](../../changes/archive/2026-11-10-lista-compartida/design.md) |
| La lista donde se ven las tareas | Capability vecina [`task-list`](../task-list/spec.md) |
| Historias de origen | [E2-1](../../../docs/backlog/E2-gestion-tareas/us-crear-tarea.md) (crear con solo el título) y [E2-3](../../../docs/backlog/E2-gestion-tareas/us-responsable-y-estado-por-defecto.md) (nace mía y pendiente) |

## Recorrido

Cómo se encadenan las piezas, que la spec y el OpenAPI describen por separado:

1. **Iniciar sesión.** Sin sesión no se puede crear ni ver ninguna tarea.
2. **Crear** con solo el título. El responsable y el estado los pone el servidor.
3. **Ver** la tarea en la lista del equipo (capability `task-list`), con el mismo responsable y estado.

En la pantalla, la tarea creada se ve sin recargar ([SC-21](./spec.md)). Si la lista aún no había cargado, se vuelve a pedir entera, para que una carga lenta no haga desaparecer la tarea nueva ([SC-28](./spec.md)).

Cuando algo falla:

- **Falla la creación:** se explica en castellano y el título sigue escrito ([SC-27](./spec.md)).
- **La sesión ya no es válida** (la API responde 401): la pantalla cierra la sesión y lleva al inicio de sesión.

## Por qué así

**Solo el título.** Anotar en qué andas tiene que costar segundos, así que crear una tarea no pide nada más. Las decisiones técnicas que salen de aquí están en el [`design.md`](../../changes/archive/2026-11-10-lista-compartida/design.md): tres estados fijos sin tabla de estados, sin `creator_id` y, del responsable, nunca el email.

## Dónde está el código

| Capa | Ficheros |
|---|---|
| Datos | `backend/database/migrations/*_create_tasks_table.ts`, `backend/app/models/task.ts` |
| API | `backend/start/routes.ts` (rutas y `middleware.auth()`), `backend/app/controllers/tasks_controller.ts`, `backend/app/validators/task.ts`, `backend/app/transformers/task_transformer.ts` |
| Cliente | `frontend/src/lib/api.ts` (`createTask`, `listTasks`), `frontend/src/lib/types.ts` (`Task`), `frontend/src/lib/task-status.ts` (etiquetas de los estados) |
| Pantalla | `frontend/src/pages/tasks-page.tsx`, `frontend/src/components/task-row.tsx` |
| Tests | `backend/tests/functional/tasks/create.spec.ts`, `backend/tests/functional/tasks/list.spec.ts`, `frontend/src/pages/tasks-page.test.tsx`, `frontend/src/pages/task-list.test.tsx`, `frontend/e2e/crear-tarea.spec.ts`, `frontend/e2e/responsable-y-estado.spec.ts` |

La matriz [`docs/trazabilidad/matrix.md`](../../../docs/trazabilidad/matrix.md) cruza cada escenario con sus tests.

> **Ojo:** los tests del backend vacían la base de datos de desarrollo (`backend/tmp/db.sqlite3`), porque la comparten con el servidor. Ver [`CLAUDE.md`](../../../CLAUDE.md).

## Qué falta

- **Reglas del título:** [E2-2](../../../docs/backlog/E2-gestion-tareas/us-titulo-obligatorio.md). Hoy un título vacío o solo de espacios ya se rechaza, pero con un error técnico en inglés y sin ningún escenario que lo fije. La longitud no tiene límite.
- **Cambiar el estado:** [E2-4](../../../docs/backlog/E2-gestion-tareas/us-cambiar-estado.md). Los tres estados existen, pero toda tarea se queda en «Pendiente».
- **Abrir, editar el título, reasignar y borrar:** [E2-5](../../../docs/backlog/E2-gestion-tareas/us-abrir-tarea.md), [E2-6](../../../docs/backlog/E2-gestion-tareas/us-editar-titulo.md), [E2-7](../../../docs/backlog/E2-gestion-tareas/us-reasignar-responsable.md) y [E2-10](../../../docs/backlog/E2-gestion-tareas/us-borrar-tarea.md).
- **Fecha de vencimiento:** [FS-118](../../../docs/backlog/E2-gestion-tareas/us-fechas-vencimiento.md).
- **Filtrar por estado:** [FS-142](../../../docs/backlog/E2-gestion-tareas/us-filtrar-por-estado.md).
- **Que la lista se refresque sola:** [E3-2](../../../docs/backlog/E3-actividad-equipo/us-lista-viva.md). Hoy, lo que crea otra persona no aparece hasta volver a cargar la lista.
- **Paginación:** no hay. La lista devuelve todas las tareas, pensando en un techo de unas 200 (RNF-5).
