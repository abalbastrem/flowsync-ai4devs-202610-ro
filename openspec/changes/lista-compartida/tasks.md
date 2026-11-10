# Tasks

> Cada grupo corresponde a un requisito de `specs/`. Dentro de cada grupo, los tests van primero y deben fallar por el motivo esperado; después va la implementación, hasta que pasen. En backend: `cd backend && node ace test functional`. En frontend: `cd frontend && npm test`.

## 1. Se crea una tarea indicando solo el título (tasks)

- [x] 1.1 Preparación del backend: migración `tasks` (`id`, `title`, `status`, `assignee_id` FK a `users`, timestamps), `node ace migration:run` y modelo `Task` con `belongsTo` `assignee`. Verificación: la migración se aplica sin errores y `database/schema.ts` regenerado contiene el schema de `tasks`.
- [x] 1.2 Tests de API en `tests/functional/tasks/create.spec.ts`, aislados con `testUtils.db().truncate()`. Casos: con sesión y solo un título responde 201 y devuelve la tarea con ese título; sin sesión responde 401 y no queda ninguna tarea en la base de datos. Verificación: fallan porque la ruta no existe (404).
- [x] 1.3 Implementación de la API: `createTaskValidator`, `TaskTransformer` (`id`, `title`, `status`, `assignee: { id, fullName, initials }`), controlador `store` y `POST /api/v1/tasks` dentro del grupo con `middleware.auth()`. Hay que commitear el `.adonisjs/` regenerado. Verificación: los tests de 1.2 pasan, y `npm run lint` y `npm run typecheck` del backend quedan limpios.
- [x] 1.4 Preparación del frontend: instalar Vitest, Testing Library, jsdom y MSW; configurar Vitest (entorno jsdom, alias `@`, servidor de MSW en el setup) y añadir el script `npm test`. Escribir el ADR `docs/adr/0001-stack-de-tests-frontend.md` en formato MADR (opciones consideradas: MSW frente a `vi.mock` de `lib/api`) y sustituir en `CLAUDE.md` la frase «No hay runner de tests instalado» por la referencia al ADR. Verificación: `npm test` ejecuta un test trivial de humo y pasa.
- [x] 1.5 Tests de componente de la pantalla de lista, con la API simulada por MSW. Casos: el formulario de alta solo tiene el campo título; crear envía una petición que solo contiene `title`; no se ofrece ningún control de responsable, estado ni fecha. Verificación: fallan porque la pantalla no existe.
- [x] 1.6 Implementación del frontend: `createTask` en `src/lib/api.ts`, tipo `Task` en `src/lib/types.ts`, `TasksPage` en `/` dentro de `ProtectedRoute`, y el comodín `*` redirige a `/`. Verificación: los tests de 1.5 pasan, y `npm run build` y `npm run lint` quedan limpios.

## 2. La lista es la misma para todos los miembros (task-list)

- [x] 2.1 Tests de API en `tests/functional/tasks/list.spec.ts`. Casos: dos usuarios distintos reciben exactamente el mismo conjunto de tareas; una tarea de la que es responsable otra persona aparece en la lista de cualquiera. Verificación: fallan porque `GET /api/v1/tasks` no existe.
- [x] 2.2 Implementación del controlador `index` y de `GET /api/v1/tasks` (autenticado), con precarga del `assignee`. Verificación: los tests de 2.1 pasan.
- [x] 2.3 Tests de componente: la pantalla pinta todas las tareas que devuelve la API, sin filtrar por usuario. Verificación: fallan porque la pantalla todavía no carga la lista.
- [x] 2.4 Implementación de `listTasks` en `src/lib/api.ts` y de la carga de la lista en `TasksPage`. Verificación: los tests de 2.3 pasan.

## 3. La lista exige haber iniciado sesión (task-list)

- [ ] 3.1 Tests. API: `GET /api/v1/tasks` sin credenciales responde 401 y el cuerpo no contiene tareas. Componente: sin sesión, al abrir `/` se llega a `/login` y no se ve ninguna tarea. Verificación: confirmar que los tests comprueban el caso de verdad. Si pasan ya de entrada porque el guard existe, hay que verificarlo rompiendo el guard un momento.
- [ ] 3.2 Implementación, si hace falta, de lo que no cubran ya `middleware.auth()` y `ProtectedRoute`. Verificación: los tests de 3.1 pasan.

## 4. Cada fila muestra título, responsable y estado (task-list)

- [ ] 4.1 Tests. API: cada tarea de la respuesta trae `title`, `status` y `assignee`. Componente: cada fila muestra el título, el responsable y el estado con su etiqueta («Pendiente», «En curso», «Hecho»), usando tareas simuladas en los tres estados. Verificación: fallan las etiquetas de estado.
- [ ] 4.2 Implementación de la fila de la lista, con la traducción de `status` a su etiqueta. Verificación: los tests de 4.1 pasan.

## 5. El responsable se identifica por su nombre (task-list)

- [ ] 5.1 Tests. API: con un responsable sin nombre, `assignee.fullName` es null e `assignee.initials` existe; ninguna tarea incluye `email`. Componente: un responsable con nombre se ve como «Ana García»; uno sin nombre se ve por sus iniciales y su email no aparece en la pantalla. Verificación: falla el caso sin nombre.
- [ ] 5.2 Implementación de `assignee.fullName ?? assignee.initials` en la fila. Verificación: los tests de 5.1 pasan.

## 6. La tarea nace con quien la crea como responsable (tasks)

- [ ] 6.1 Tests. API: la tarea creada tiene como `assignee` al usuario autenticado, tanto en la respuesta del POST como en un GET posterior. Componente: después de crear, la fila muestra el nombre de quien ha iniciado sesión. Verificación: fallan si el servidor no asigna al autor.
- [ ] 6.2 Implementación: el controlador `store` fija `assignee_id` con el usuario autenticado. Verificación: los tests de 6.1 pasan.

## 7. La tarea nace en «Pendiente» (tasks)

- [ ] 7.1 Tests. API: una tarea recién creada tiene `status = pending`. Componente: la fila nueva muestra «Pendiente». Verificación: fallan si no hay valor inicial.
- [ ] 7.2 Implementación: el controlador `store` fija `status = pending`. Verificación: los tests de 7.1 pasan.

## 8. Solo existen tres estados fijos (tasks)

- [ ] 8.1 Test de componente: en la pantalla no hay ningún control para crear, renombrar o eliminar estados, y solo se muestran las etiquetas «Pendiente», «En curso» y «Hecho». Verificación: confirmar que el test falla si se añade un control o una etiqueta de más.
- [ ] 8.2 Implementación: el conjunto de estados queda cerrado en un único sitio del backend y en otro del frontend. Verificación: el test de 8.1 pasa.

## 9. Las tareas más recientes van primero (task-list)

- [ ] 9.1 Tests. API: con las tareas «A», «B» y «C» creadas en ese orden, la lista devuelve «C», «B», «A», y el orden se mantiene aunque coincidan los `created_at`. Componente: las filas se pintan en el orden que devuelve la API. Verificación: falla el orden.
- [ ] 9.2 Implementación del `orderBy('created_at', 'desc').orderBy('id', 'desc')` en `index`. Verificación: los tests de 9.1 pasan.

## 10. La tarea creada se ve sin recargar (tasks)

- [ ] 10.1 Test de componente: después de crear una tarea, aparece la primera de la lista sin una nueva petición GET (lo comprueba el handler de MSW). Verificación: falla si la pantalla vuelve a pedir la lista o no inserta la tarea.
- [ ] 10.2 Implementación: insertar al principio del estado local la tarea devuelta por el POST. Verificación: el test de 10.1 pasa.

## 11. La lista no muestra fechas ni presencia (task-list)

- [ ] 11.1 Tests. API: las tareas de la respuesta no incluyen campos de fecha. Componente: ninguna fila muestra una fecha ni una marca de vencida, y la pantalla no muestra ningún indicador de presencia ni de actividad. Verificación: falla la API si el transformer expone timestamps.
- [ ] 11.2 Implementación: ajustar el transformer y la fila hasta que pasen. Verificación: los tests de 11.1 pasan.

## 12. La lista vacía explica qué es y ofrece crear la primera tarea (task-list)

- [ ] 12.1 Test de componente: si la API devuelve una lista vacía, se ve un texto explicativo y el formulario para crear la primera tarea, y no aparece una lista vacía sin más. Verificación: falla porque no hay estado vacío.
- [ ] 12.2 Implementación del estado vacío en `TasksPage`. Verificación: el test de 12.1 pasa.

## 13. Hay una sola lista de tareas (task-list)

- [ ] 13.1 Test de componente: con sesión, la navegación no ofrece ninguna vista «mis tareas» ni otra lista, y `/` es la única vista de tareas. Verificación: confirmar que el test falla si se añade una segunda vista.
- [ ] 13.2 Implementación, si hace falta, de un ajuste en la navegación (por ejemplo, el enlace entre la lista y el perfil). Verificación: el test de 13.1 pasa.

## 14. Consultar la lista no modifica nada (task-list)

- [ ] 14.1 Test de API: con tareas en los tres estados, varias consultas seguidas no cambian el título, el responsable, el estado ni el `updated_at` de ninguna tarea. Verificación: confirmar que el test compara el estado de la base de datos antes y después.
- [ ] 14.2 Implementación: ninguna, si `index` es de solo lectura. Verificación: el test de 14.1 pasa.

## 15. Integración

- [ ] 15.1 Recorrido manual con `make start`: registrar una persona con nombre y otra sin nombre, crear tareas con cada una y comprobar desde las dos sesiones que ven la misma lista, en el orden correcto, con nombre o iniciales y en «Pendiente». Verificación: el recorrido se cumple de principio a fin.
- [ ] 15.2 Comprobación final: `node ace test`, `npm run lint` y `npm run typecheck` en el backend; `npm test`, `npm run lint` y `npm run build` en el frontend. Verificación: todo en verde.

## Workflow follow-up

- `openspec archive lista-compartida` dentro del mismo PR, antes del merge, para que el código y la spec entren juntos.
