# Proposal

## Why

El PRD exige que ningún error técnico crudo llegue a la persona y que los fallos de conexión expliquen qué hacer (RNF-10), en castellano (RNF-8). La pantalla de la lista ya lo hace, pero ningún escenario lo recogía: el análisis de ramas de la matriz de trazabilidad lo marcó como comportamiento visible sin criterio. Además, crear una tarea mientras la lista aún carga es un caso límite de «La tarea creada se ve sin recargar» que tampoco tenía escenario.

Origen:
- [PRD — RNF-8 y RNF-10](../../../docs/prd/flowsync-mvp.md)
- [E3-1 — La lista compartida del equipo](../../../docs/backlog/E3-actividad-equipo/us-lista-compartida.md) y [E2-1 — Crear tarea con solo el título](../../../docs/backlog/E2-gestion-tareas/us-crear-tarea.md)

## What Changes

- Si la lista no se puede cargar, se explica y se ofrece reintentar.
- Si crear una tarea falla, se explica y no se pierde el título escrito.
- Una carga de la lista que llegue tarde no hace desaparecer la tarea recién creada.
- El mensaje de falta de conexión deja de nombrar el backend: explica qué hacer.

Fuera de alcance:
- La sesión caducada (un 401 a mitad de uso): es E1, «Cuentas y acceso», aplazada.
- Los errores de validación del título: son E2-2.
