# Proposal

## Why

FlowSync existe para responder «¿en qué anda cada uno y qué hay libre?» sin preguntar a nadie, y hoy solo sabe registrar a una persona y dejarla entrar. Este change crea la superficie donde ocurre el producto: una lista única y compartida, y la forma más barata posible de llenarla, que es crear una tarea con solo el título, que nazca a tu nombre y en «Pendiente».

Va primero porque es el sustrato de todo lo demás: sin lista no hay dónde cambiar un estado, ni nada que filtrar. La lista y la creación se entregan juntas porque la una no se puede comprobar sin la otra.

Historias de origen:
- [E3-1 — La lista compartida del equipo](../../../docs/backlog/E3-actividad-equipo/us-lista-compartida.md) (RF-16, RF-17)
- [E2-1 — Crear tarea con solo el título](../../../docs/backlog/E2-gestion-tareas/us-crear-tarea.md) (RF-5)
- [E2-3 — Nace mía y pendiente](../../../docs/backlog/E2-gestion-tareas/us-responsable-y-estado-por-defecto.md) (RF-7, RF-8)

## What Changes

- Una lista única con todas las tareas del espacio, idéntica para todos sus miembros. Cada fila muestra el título, el responsable y el estado.
- Crear una tarea pidiendo solo el título. La tarea nace con quien la crea como responsable y en estado «Pendiente».
- Tres estados fijos: «Pendiente», «En curso» y «Hecho». Este change no permite cambiar de estado; eso llega con E2-4.

Decisiones de producto que este change fija:
- **Espacio único e implícito.** Todas las personas registradas forman un solo equipo. No hay que crear un espacio ni unirse a uno (resuelve el hueco de PA-11 para el MVP).
- **Orden de la lista.** Primero las tareas más recientes. No se agrupan por persona: PA-3 sigue abierto en cuanto a la agrupación.
- **Responsable sin nombre.** El registro admite cuentas sin nombre. En ese caso, la lista identifica a la persona por sus iniciales, nunca por su email ni por un identificador interno.
- **Criterios propuestos que se aceptan:** CA-12 de E3-1 (la lista no muestra presencia), CA-7 de E3-1 (la lista no muestra fechas) y CA-3 de E2-1 (la tarea recién creada se ve sin recargar).

Fuera de alcance:
- Las reglas del título, como vacío o longitud: son E2-2.
- Que la lista se refresque sola con los cambios de otras personas: es E3-2. Aquí la lista es correcta en el momento en que se pide.
- La agrupación por persona (PA-3), el límite de tareas «En curso» (PA-4) y el choque de ediciones (PA-8).

## Capabilities

### New Capabilities
- `task-list`: la lista compartida del equipo, es decir, qué tareas se ven, quién las ve, qué muestra cada fila, en qué orden y qué pasa cuando no hay ninguna.
- `tasks`: el ciclo de vida de una tarea. En este change cubre la creación, los valores con los que nace y el conjunto fijo de estados.

### Modified Capabilities
- Ninguna.

## Impact

- API: dos operaciones nuevas, consultar la lista y crear una tarea, ambas solo para personas con sesión.
- Datos: aparece la entidad «tarea», ligada a su responsable.
- Frontend: la lista pasa a ser la pantalla de entrada tras iniciar sesión.
- Pruebas: es el primer change con pruebas, así que paga la base de tests del backend y del frontend (R-7 del backlog).
