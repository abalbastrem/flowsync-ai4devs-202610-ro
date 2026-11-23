# Tasks

> Cada grupo corresponde a un requisito de `specs/`. Los tests van primero y deben fallar por el motivo esperado; si el comportamiento ya existe, se comprueba que el test detecta el fallo rompiendo el código un momento. En backend: `cd backend && node ace test --files=tasks/create`.

## 1. Se crea una tarea indicando solo el título (tasks)

- [x] 1.1 Test de interfaz pública (Japa functional, base de datos aislada con `testUtils.db()`): SC-29. Con sesión, `POST /api/v1/tasks` con un título, el `id` de otra persona como responsable y `status: 'done'`; responde 201, la tarea tiene como responsable a quien la creó y está en `pending`, también en la lista. Verificación: el comportamiento ya existe, así que se comprueba rompiéndolo un momento (el validador acepta `status` y el controlador lo usa) y viendo el test fallar porque el estado sale `done`.
- [x] 1.2 Implementación: ninguna, si 1.1 pasa. Verificación: el test de 1.1 pasa.

## 2. Cierre

- [ ] 2.1 E2E: no hay pantalla nueva; ninguno.
- [ ] 2.2 Auditoría de cobertura: sin ramas nuevas (no hay código nuevo), y `make matriz-check` en verde con 29 escenarios.
