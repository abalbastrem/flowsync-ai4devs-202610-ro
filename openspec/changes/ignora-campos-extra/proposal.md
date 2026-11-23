# Proposal

## Why

Crear una tarea pide solo el título: el responsable y el estado los pone el servidor (E2-1, E2-3). Hoy la API ya ignora cualquier otro campo del cuerpo, pero ningún escenario lo fija. Al escribir el README de la capability `tasks`, la revisión lo marcó como comportamiento sin criterio: si mañana el validador aceptara `status` o un responsable, ningún test fallaría.

Origen:
- [E2-1 — Crear tarea con solo el título](../../../docs/backlog/E2-gestion-tareas/us-crear-tarea.md)
- [E2-3 — Nace mía y pendiente](../../../docs/backlog/E2-gestion-tareas/us-responsable-y-estado-por-defecto.md)

## What Changes

- Un escenario nuevo, SC-29: una petición de creación con campos además del título responde igual que una con solo el título, y la tarea nace con quien la crea como responsable y en «Pendiente».
- Sin cambios de código: el comportamiento ya existe.

Fuera de alcance:
- Rechazar los campos de más con un error, en vez de ignorarlos.
- Las reglas del título: son E2-2.

## Capabilities

### New Capabilities
- Ninguna.

### Modified Capabilities
- `tasks`: el requisito «Se crea una tarea indicando solo el título» gana el escenario SC-29.

## Impact

- Pruebas: un test functional nuevo en el backend.
