# PRD — MVP de FlowSync

## 1. Problema y contexto

En los equipos remotos pequeños nadie ve en qué está cada uno sin interrumpir a alguien. Hoy eso se paga con la ronda de "¿en qué estás?", que se come la mitad de una daily de 15 minutos, con preguntas constantes por chat y con trabajo duplicado. Episodio real: dos personas tocaron el mismo módulo la misma semana sin saberlo y se perdieron dos días.

La daily no desaparece entera. Desaparece la ronda de estado; la parte de bloqueos sigue, y este MVP no la ataca.

**Punto de partida.** FlowSync hoy solo tiene cuentas: registrarse, iniciar sesión, ver el propio perfil y cerrar sesión. No existe ninguna noción de tarea. Todo lo que define este PRD es nuevo, y la gestión de cuentas no se vuelve a especificar.

## 2. Usuarios

Los miembros de un equipo remoto de 3–10 personas, con roles planos: todos ven y editan lo mismo, y no hay lead ni manager que consuma reportes. El valor lo cobran los pares: quien descubre tarde que iba a lo mismo que otro, y quien interrumpe para preguntar.

**Caso de estudio** (no es un cliente real): un equipo SaaS de 6 personas en 3 husos horarios, con un gestor de tareas pesado y una daily de 15 minutos por videollamada.

## 3. Objetivo y métrica de éxito

**Hipótesis.** Si ver quién está en qué cuesta cero y actualizarlo cuesta dos clics sobre la lista que ya tienes abierta, el equipo deja de necesitar la ronda de "¿en qué estás?".

**Criterio de éxito, a una semana de uso real:** el equipo cancela esa ronda de la daily y nadie pide que vuelva. Si la siguen haciendo igual, no funcionó.

**Cómo se mide.** Preguntando al equipo al cabo de la semana. El MVP no incluye analítica (ver §5).

## 4. Scope

Una vertical fina y usable de punta a punta. FlowSync **sustituye** al gestor de tareas, no convive con él.

1. **Una única lista de tareas compartida** por todos los usuarios registrados.
2. **Crear una tarea escribiendo solo el título.** Nace pendiente y libre (sin responsable).
3. **Coger una tarea** en un clic: pasa a "en curso" y todos ven quién la tiene.
4. **Cambiar el estado** entre tres estados fijos: pendiente, en curso y hecha. Volver a pendiente la suelta.
5. **Editar** el título y la fecha de vencimiento, y **borrar** una tarea.
6. **Ver de un vistazo qué se ha pasado de plazo.**
7. **Filtrar la lista por estado**, eligiendo entre valores predefinidos.
8. **Ver los cambios de los demás sin refrescar.**

## 5. Out of scope

| Exclusión | Por qué |
|---|---|
| Asignar una tarea a otra persona | La hipótesis es "cojo yo lo que está libre". Asignar a otros es un patrón de lead, y aquí no hay lead. |
| Bloquear una tarea para que nadie más la coja | Para validar basta con ver que ya está cogida. Bloquear impone una regla antes de saber si hace falta. Es la exclusión más dudosa (ver §8). |
| Resumen de "qué ha cambiado desde tu última visita" | La lista ya muestra el estado actual y fresco, y eso cubre "llego y veo qué se ha movido". Un histórico por usuario es otra capability. |
| Vista kanban por columnas | Una lista con filtro por estado basta para saber quién está en qué. |
| Descripción, comentarios y adjuntos | Convierten la lista en un sitio donde se conversa, y la hipótesis es de estado, no de discusión. Los comentarios ya estaban descartados. |
| Notificaciones push e integración con Slack | Interrumpen, y la señal tiene que ser un resumen que espera. |
| Quién está conectado e indicadores de actividad | Es presencia de la persona, no frescura de la tarea: vigilancia, rechazada a propósito. |
| Sprints, estimaciones, épicas, prioridad y orden manual | No dicen quién está en qué, y un equipo que los necesite no es nuestro usuario. |
| Informes, analítica e historial | No hay nadie arriba que los lea, y no validan nada para los pares. |
| Varios equipos o espacios, invitaciones, roles y permisos | Con un espacio único y roles planos el caso de estudio ya se valida. |
| Estados configurables | Configurar es justo el "rollo de Jira" que se quiere evitar. |
| Integraciones con Git, CI o calendario, e importar del gestor anterior | Es otro producto, con OAuth de terceros. Además, el estado lo cambia a mano quien hace la tarea, con un par de clics, en vez de derivarse de señales externas. |
| Resolver los bloqueos de la daily | Esa parte de la reunión sigue, y no forma parte de la hipótesis. |
| Editar el perfil y recuperar la contraseña | No tocan la hipótesis, y las cuentas ya existen. |

## 6. Requisitos funcionales

- **FR-1** Todo usuario autenticado ve la misma lista. En cada tarea se ve el título, el responsable (o "libre"), el estado y la fecha de vencimiento, si la tiene.
- **FR-2** Se crea una tarea con solo el título. Nace en estado pendiente, sin responsable y sin fecha de vencimiento.
- **FR-3** Coger una tarea la pone en curso con quien la coge como responsable. Si la tarea ya la tiene otra persona, se pide confirmación antes de cambiar el responsable. No se bloquea, pero se evitan los errores.
- **FR-4** El estado se puede cambiar entre pendiente, en curso y hecha. Al volver a pendiente, la tarea pierde su responsable y queda libre.
- **FR-5** Cualquier usuario puede editar el título y poner, cambiar o quitar la fecha de vencimiento de cualquier tarea. El título no puede quedar vacío.
- **FR-6** Cualquier usuario puede borrar cualquier tarea, pidiendo confirmación antes.
- **FR-7** Una tarea con la fecha de vencimiento pasada y que no está hecha se distingue visualmente como vencida.
- **FR-8** La lista se puede filtrar por estado con un selector de valores fijos: todas, pendiente, en curso y hecha. Por defecto se muestran todas.
- **FR-9** Las creaciones, ediciones, cambios de estado y borrados que hacen otros aparecen en la lista sin recargar la página.

## 7. Requisitos no funcionales

Palabras clave según RFC 2119. **MUST**: si no se cumple, no se lanza. **SHOULD**: es el objetivo; se puede negociar con un motivo. **MAY**: opcional.

- **NFR-1 Frescura.** Un cambio hecho por un usuario MUST ser visible en la lista de los demás en ≤ 5 s.
- **NFR-2 Coste de actualizar.** Coger una tarea o cambiarle el estado MUST requerir como máximo dos clics desde la lista, sin campos obligatorios.
- **NFR-3 Acceso.** Ver y modificar tareas MUST requerir una sesión iniciada.
- **NFR-4 Sin presencia.** El producto MUST NOT registrar ni mostrar quién está conectado ni su actividad.
- **NFR-5 Consistencia.** Si dos personas cambian la misma tarea a la vez, gana el último cambio, y todos MUST ver ese mismo estado final en ≤ 5 s.
- **NFR-6 Rendimiento.** La lista SHOULD cargar en < 2 s con 200 tareas.
- **NFR-7 Navegadores.** El producto SHOULD funcionar en las dos últimas versiones de Chrome, Firefox, Safari y Edge de escritorio. MAY funcionar en anchos de móvil.

## 8. Supuestos y riesgos

**Supuestos** (lo que la ficha no cubre y se ha decidido):
- Evitar el trabajo duplicado es **visibilidad, no bloqueo**: no se impide coger una tarea que ya tiene otra persona, solo se pide confirmación (FR-3).
- Una persona puede tener varias tareas en curso a la vez.
- Sin orden manual, la lista muestra primero las tareas más recientes.
- Un espacio único: varios equipos, o gente que esté en más de uno, quedan fuera del MVP.

**Riesgos:**
1. **La información se queda vieja.** Si nadie actualiza, el producto pierde el sentido. Es el riesgo #1 a validar. La mitigación es que actualizar cueste dos clics (NFR-2), no obligar a nadie.
2. **La visibilidad no basta para evitar el trabajo duplicado.** Si en la semana de prueba aparece aunque sea un caso de dos personas en curso sobre la misma tarea a pesar de verla cogida, entra el bloqueo.
3. **El equipo sigue usando el gestor anterior en paralelo.** La doble actualización es como muere esta categoría. El MVP tiene que bastar por sí solo.