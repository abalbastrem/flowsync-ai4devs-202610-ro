# PRD — MVP de FlowSync

## 1. Problema y contexto

En los equipos remotos pequeños nadie ve en qué está cada uno sin interrumpir a alguien. Hoy eso se paga con la ronda de "¿en qué estás?", que se come la mitad de una daily de 15 minutos, con preguntas constantes por chat y con trabajo duplicado. Episodio real: dos personas tocaron el mismo módulo la misma semana sin saberlo y se perdieron dos días.

La daily no desaparece entera. Desaparece la ronda de estado; la parte de bloqueos sigue, y este MVP no la ataca.

**Punto de partida.** FlowSync hoy solo tiene cuentas: registrarse, iniciar sesión, ver el propio perfil y cerrar sesión. No existe ninguna noción de tarea. Todo lo que define este PRD es nuevo, y la gestión de cuentas no se vuelve a especificar.

## 2. Usuarios

Los miembros de un equipo remoto de 3–10 personas, con roles planos: todos ven y editan lo mismo, y no hay lead ni manager que consuma reportes. El valor lo cobran los pares: quien descubre tarde que iba a lo mismo que otro, y quien interrumpe para preguntar.

**Caso de estudio** (no es un cliente real): un equipo SaaS de 6 personas en 3 husos horarios, con un gestor de tareas pesado y una daily de 15 minutos por videollamada.

## 3. Objetivo y métrica de éxito

**Hipótesis.** Si ver quién está en qué y qué se ha movido cuesta cero, y actualizarlo cuesta dos clics sobre la lista que ya tienes abierta, el equipo deja de necesitar la ronda de "¿en qué estás?".

**Criterio de éxito, a una semana de uso real:** el equipo cancela esa ronda de la daily y nadie pide que vuelva. Si la siguen haciendo igual, no funcionó.

**Cómo se mide.** Preguntando al equipo al cabo de la semana, a todos sus miembros: ¿se ha cancelado la ronda?, ¿alguien ha pedido recuperarla?, ¿alguien ha empezado algo que ya tenía otra persona? El MVP no incluye analítica (ver §5).

## 4. Scope

Una vertical fina y usable de punta a punta. FlowSync **sustituye** al gestor de tareas, no convive con él.

1. **Una única lista de tareas compartida** por todos los usuarios registrados.
2. **Crear una tarea escribiendo solo el título.** Nace pendiente y libre (sin responsable).
3. **Coger una tarea** en un clic: pasa a "en curso" y todos ven quién la tiene.
4. **Cambiar el estado** entre tres estados fijos: pendiente, en curso y hecha. Ponerla en curso te la asigna; pendiente o hecha la deja sin responsable.
5. **Editar** el título y la fecha de vencimiento, y **borrar** una tarea.
6. **Ver de un vistazo qué se ha pasado de plazo.**
7. **Filtrar la lista por estado**, eligiendo entre valores predefinidos.
8. **Ver los cambios de los demás sin refrescar.**
9. **Un resumen de lo que ha cambiado desde tu última visita**, arriba y separado de la lista: el "llego por la mañana y veo qué se ha movido".

## 5. Out of scope

| Exclusión | Por qué |
|---|---|
| Asignar una tarea a otra persona | La hipótesis es "cojo yo lo que está libre". Asignar a otros es un patrón de lead, y aquí no hay lead. |
| Bloquear una tarea para que nadie más la coja | Para validar basta con ver que ya está cogida, y la confirmación (FR-4) evita los despistes. Bloquear impone una regla antes de saber si hace falta. Es la exclusión más dudosa (ver riesgo 2). |
| Filtro "mis tareas" | No lo pide la ficha. Con 3–10 personas la lista se lee entera, y el responsable ya se ve en cada tarea. |
| Vista kanban por columnas | Las columnas no dan información que no dé el filtro por estado. La hipótesis es quién está en qué, no el flujo de trabajo. |
| Descripción, comentarios y adjuntos | Convierten la lista en un sitio donde se conversa o se documenta, y la hipótesis es de estado, no de discusión ni de documentación. |
| Notificaciones push e integración con Slack | Interrumpen, y la señal tiene que ser un resumen que espera (scope 9). |
| Quién está conectado e indicadores de actividad | Es presencia de la persona, no frescura de la tarea: vigilancia, rechazada a propósito. |
| Sprints, estimaciones, épicas, prioridad y orden manual | No dicen quién está en qué, y un equipo que los necesite no es nuestro usuario. |
| Informes y analítica | No hay nadie arriba que los lea, y no validan nada para los pares. |
| Historial completo de cada tarea | El resumen de la última visita cubre "qué se ha movido". Lo que pasó antes de eso no ayuda a decidir qué coger hoy. |
| Varios equipos o espacios, invitaciones, roles y permisos | Con un espacio único y roles planos el caso de estudio ya se valida. El precio es el riesgo 4. |
| Estados configurables | Configurar es justo el "rollo de Jira" que se quiere evitar. |
| Integraciones con Git, CI o calendario, e importar del gestor anterior | Es otro producto, con OAuth de terceros. Además, el estado lo cambia a mano quien hace la tarea, con un par de clics, en vez de derivarse de señales externas. |
| Versión para móvil | El trabajo, y la lista que hace de cola, viven en el escritorio. Una versión móvil no cambia la hipótesis. |
| Resolver los bloqueos de la daily | Esa parte de la reunión sigue, y no forma parte de la hipótesis. |
| Editar el perfil y recuperar la contraseña | Son higiene de cuentas, no visibilidad del trabajo: no ayudan a validar la hipótesis. |

## 6. Requisitos funcionales

Palabras clave según [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119): **MUST** es un requisito absoluto; **SHOULD** admite excepciones con un motivo entendido y aceptado; **MAY** es opcional.

**Lista y tareas**
- **FR-1** Todo usuario autenticado MUST ver la misma lista. Cada tarea MUST mostrar título, responsable (o "libre"), estado y fecha de vencimiento si la tiene.
- **FR-2** La lista MUST ordenarse por fecha de creación, de la más reciente a la más antigua.
- **FR-3** Crear una tarea MUST requerir solo el título. La tarea MUST nacer pendiente, sin responsable y sin fecha de vencimiento.

**Estado y responsable**
- **FR-4** Coger una tarea MUST ponerla en curso con quien la coge como responsable. Si ya está en curso con otra persona, el sistema MUST pedir confirmación antes de cambiar el responsable.
- **FR-5** El estado MUST poder cambiarse entre pendiente, en curso y hecha, con estas reglas:
  - Pasar a **en curso**, desde cualquier estado, MUST asignar la tarea a quien hace el cambio (equivale a cogerla, FR-4).
  - Pasar a **pendiente** o a **hecha** MUST dejar la tarea sin responsable.
  - Cambiar el estado de una tarea en curso de otra persona MUST pedir confirmación.
- **FR-6** Si la tarea ha cambiado desde que el usuario la vio, cualquier cambio sobre ella MUST mostrar su estado actual y pedir confirmación. Si se confirma, el cambio del usuario MUST prevalecer.

**Edición, borrado y plazos**
- **FR-7** Cualquier usuario MUST poder editar el título y poner, cambiar o quitar la fecha de vencimiento de cualquier tarea. El título MUST NOT quedar vacío ni hecho solo de espacios.
- **FR-8** Cualquier usuario MUST poder borrar cualquier tarea, previa confirmación.
- **FR-9** La fecha de vencimiento es un día, sin hora. Una tarea no hecha cuya fecha es anterior a hoy MUST mostrar la fecha en rojo con la etiqueta "Vencida". Una tarea que vence hoy no está vencida.

**Filtro, frescura y resumen**
- **FR-10** La lista MUST poder filtrarse con un selector de valores fijos: todas, pendiente, en curso y hecha. Por defecto MUST mostrar todas.
- **FR-11** Las creaciones, ediciones, cambios de estado y borrados de otros MUST aparecer en la lista sin que el usuario recargue.
- **FR-12** Encima de la lista, y separado de ella, MUST aparecer un resumen de los cambios que otros han hecho desde la última visita del usuario: creaciones, cambios de estado o responsable, ediciones y borrados. Cada entrada MUST decir quién, qué tarea, qué cambió y cuándo, de la más reciente a la más antigua. Si no hay cambios, MUST decirlo.

## 7. Requisitos no funcionales

- **NFR-1 Frescura.** Un cambio hecho por un usuario MUST ser visible en la lista de los demás usuarios con la app abierta en ≤ 5 s.
- **NFR-2 Coste de actualizar.** Coger una tarea o cambiarle el estado MUST requerir como máximo dos clics desde la lista (contando la confirmación cuando la hay), sin campos obligatorios. Crear una tarea MUST requerir solo escribir el título y confirmar.
- **NFR-3 Acceso.** Ver y modificar tareas MUST requerir una sesión iniciada.
- **NFR-4 Sin presencia.** El producto MUST NOT mostrar quién está conectado ni indicadores de actividad de las personas. Mostrar quién hizo un cambio en una tarea (FR-12) es información de la tarea, no de presencia.
- **NFR-5 Rendimiento.** La lista SHOULD cargar en < 2 s con 200 tareas, en un portátil y una conexión de oficina normales.
- **NFR-6 Navegadores.** El producto SHOULD funcionar en las dos últimas versiones de Chrome, Firefox, Safari y Edge de escritorio.

## 8. Supuestos y riesgos

**Supuestos** (lo que la ficha no cubre y se ha decidido):
- Evitar el trabajo duplicado es **visibilidad, no bloqueo**: no se impide coger una tarea que ya tiene otra persona, solo se pide confirmación (FR-4).
- Una tarea **hecha no tiene responsable**: lo que importa es quién está en qué ahora, no quién la cerró.
- Una persona puede tener varias tareas en curso a la vez.
- **Última visita** es la vez anterior que el usuario abrió la app. Mientras la tiene abierta, los cambios llegan a la lista (FR-11) y no al resumen.
- El MVP solo evita el solapamiento si las tareas son **lo bastante concretas** para decir qué se toca. Dos tareas distintas sobre el mismo módulo, como en el episodio original, no se detectan.
- Un espacio único: varios equipos, o gente que esté en más de uno, quedan fuera del MVP.

**Riesgos:**
1. **La información se queda vieja.** Si nadie actualiza, el producto pierde el sentido. Es el riesgo #1 a validar. La mitigación es que actualizar cueste dos clics (NFR-2), no obligar a nadie.
2. **La visibilidad no basta para evitar el trabajo duplicado.** Puede pasar si alguien coge una tarea ajena y la otra persona no se entera, o si alguien trabaja en algo sin marcarlo. Ninguno de los dos casos deja rastro en la app, así que se pregunta al equipo al final de la semana (§3). Si aparece aunque sea un caso, entra el bloqueo.
3. **El equipo sigue usando el gestor anterior en paralelo.** La doble actualización es como muere esta categoría. El MVP tiene que bastar por sí solo.
4. **Cualquiera que se registre entra en el espacio.** El alta es abierta, no hay invitaciones y todos tienen los mismos permisos, así que un desconocido podría ver, editar o borrar cualquier tarea. Se asume para la semana de prueba con un equipo concreto. Si el producto sale de ahí, las invitaciones dejan de ser opcionales.
