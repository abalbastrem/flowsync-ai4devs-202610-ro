# Alcance del MVP de FlowSync

## 1. El terreno que ya existe

FlowSync hoy es solo la puerta de entrada de una app web: no tiene todavía ninguna funcionalidad de producto, solo cuentas de usuario.
Lo que ya funciona: registrarse (email, contraseña y un nombre opcional), iniciar sesión, ver tu propio perfil (nombre, email, iniciales y desde cuándo eres miembro) y cerrar sesión.
Lo único que la app sabe es quién es cada persona: no hay tareas, ni estados, ni responsables, ni fechas, y ningún espacio compartido donde un usuario vea algo de otro.
No hace ni intenta hacer, por ahora: editar el perfil, recuperar la contraseña, invitar a otros, equipos, roles ni permisos, y nada en tiempo real ni de notificaciones.
Todo lo que defina el MVP es nuevo; la gestión de cuentas está hecha y no hay que volver a especificarla.

## 2. El interrogatorio

**1. ¿Qué parte de la sincronización desaparece, y cómo sabremos que funcionó?**
Duele la daily y el "¿en qué estás?" constante por chat: nadie ve el estado del equipo sin interrumpir. Episodio real: dos personas tocaron el mismo módulo la misma semana sin saberlo, dos días perdidos. La daily no desaparece entera: desaparece la ronda de "¿en qué estás?" (media daily); los bloqueos siguen y este MVP no los resuelve. Éxito a una semana: el equipo cancela esa ronda y nadie pide que vuelva.

**2. ¿Quién cobra el valor?**
Los pares, no un lead: no hay reporte hacia arriba. Equipos remotos de 3–10 personas, roles planos, todos ven y editan lo mismo. Caso de estudio: equipo SaaS de 6 personas en 3 husos horarios, con un gestor de tareas pesado y daily de 15 min. Un único espacio compartido; varios equipos o gente en más de uno queda fuera.

**3. ¿Qué significa "más en tiempo real"?**
Ver los cambios de estado de las tareas sin refrescar ni preguntar. Es frescura de la tarea, no presencia de la persona: nada de "quién está conectado" ni indicadores de actividad (eso es vigilancia). Resumen que espera, no aviso que interrumpe: sin notificaciones push. No es chat, ni videollamada, ni edición simultánea.

**4. ¿De dónde sale el estado y por qué se mantiene al día?**
Lo teclea quien hace la tarea, en dos clics sobre una lista que ya tiene abierta, sin campos obligatorios. Se sostiene porque quien lo escribe cobra en el momento: la lista es su cola de trabajo y deja de recibir interrupciones. Derivarlo de Git, CI o calendario queda fuera. Sustituye al gestor de tareas, no convive con él. Si la información se queda vieja, el producto pierde el sentido: es el riesgo #1 a validar.

**5. ¿Qué es "menos rollo que Jira", y cómo se evita que dos personas vayan a lo mismo?**
Crear una tarea y cambiarle el estado en segundos, sin configuración. Una tarea lleva título, responsable, estado y fecha de vencimiento (para ver lo que se ha pasado de plazo); la lista se filtra por estado. Renuncia explícita a sprints, estimaciones, épicas, backlog priorizado e informes. La decisión que cambia: no empezar algo que otro ya está tocando y elegir lo siguiente sabiendo qué está libre. Ya decidido fuera: notificaciones push, Slack, roles/permisos avanzados, analítica, comentarios.

**Supuestos (lo que la ficha no cubre y he decidido yo):**
- Evitar trabajo duplicado es **visibilidad, no bloqueo**: coger una tarea te pone como responsable y todos lo ven; no se impide técnicamente que otro la coja.
- Una tarea puede existir **sin responsable**: así se distingue lo que está libre. El único dato imprescindible para crearla es el título.
- Tres estados fijos y no configurables: **pendiente, en curso, hecha**.
- Cualquiera puede crear, editar, reasignar o cerrar cualquier tarea (consecuencia de los roles planos).
- Una persona puede tener varias tareas en curso a la vez; el producto no lo limita.

## 3. El alcance

### Problema

En los equipos remotos pequeños nadie ve en qué está cada uno sin preguntar. El resultado es una ronda de "¿en qué estás?" que se come media daily, interrupciones constantes por chat y trabajo duplicado: dos personas que descubren tarde que iban a lo mismo.

### Usuarios

Los miembros de un equipo remoto de 3–10 personas, todos iguales, sin lead ni manager como destinatario. Caso de estudio: equipo SaaS de 6 personas en 3 husos horarios.

### Propuesta de valor

Una lista compartida que es a la vez tu cola de trabajo y el estado del equipo: miras qué está libre, lo coges en dos clics y todos lo ven sin refrescar ni preguntar. Quien actualiza cobra en el momento, porque deja de recibir el "¿cómo va?".

**Hipótesis a validar:** si ver quién está en qué cuesta cero y actualizarlo cuesta dos clics, el equipo cancela la ronda de "¿en qué estás?" en una semana y nadie pide que vuelva.

### Alcance

1. **Una lista de tareas única** para todos los usuarios registrados.
2. **Crear una tarea escribiendo solo el título.** Nace pendiente y sin responsable, es decir, libre.
3. **Coger una tarea** en un clic: pasa a "en curso" y se ve quién la tiene.
4. **Cambiar el estado** entre pendiente, en curso y hecha. Volver a pendiente la suelta y vuelve a quedar libre.
5. **Ver los cambios de los demás sin refrescar.**


### NO-alcance

En una primera propuesta, Claude ha propuesto las siguientes tres exclusiones que contradecían la ficha de hechos. Por tanto, esto no son exclusiones actuales, pero me parece interesante documentarlas.
- **Fecha de vencimiento y aviso de vencidas.**
- **Editar y borrar tareas.**
- **Asignar una tarea a otra persona.**

Las siguientes exclusiones deberían ser menos problemáticas.
- **Bloquear una tarea para que nadie más la coja.** Para validar basta con ver que ya está cogida. Bloquearla impone una regla antes de saber si hace falta.
- **Descripción, comentarios y adjuntos.** Convierten la lista en un sitio donde se conversa, y la hipótesis es de estado, no de discusión.
- **Resumen de "qué ha cambiado desde tu última visita".** La lista ya muestra el estado actual. Un histórico de cambios es otra capability.
- **Notificaciones push e integración con Slack.** Interrumpen, y la señal tiene que ser un resumen que espera.
- **Quién está conectado e indicadores de actividad.** Es presencia, no frescura de la tarea: vigilancia, rechazada a propósito.
- **Sprints, estimaciones, épicas, prioridad y orden manual.** No dicen quién está en qué, y un equipo que los necesite no es nuestro usuario.
- **Informes, analítica e historial.** No hay nadie arriba que los lea, y no validan nada para los pares.
- **Varios equipos o espacios, invitaciones, roles y permisos.** Con un espacio único y roles planos el caso de estudio ya se valida.
- **Estados configurables.** Configurar es justo el "rollo de Jira" que se quiere evitar, y tres estados fijos bastan.
- **Integraciones con Git, CI o calendario, e importar del gestor anterior.** Es otro producto, con OAuth de terceros. Además, el estado lo escribe la persona.
- **Resolver bloqueos de la daily.** Esa parte de la reunión sigue, y este MVP no la ataca.
- **Mejoras de cuenta: editar el perfil y recuperar la contraseña.** No tocan la hipótesis, y las cuentas ya existen.

---

## Las tres líneas

1. **Los dos números:**
Claude propuso 6 cosas, yo recorté a 5.
Claude propuso 15 items en NO-alcance, y he recortado a 12.

2. **Tres cosas que dejé fuera, y por qué:**
Filtrar la lista por estado. Es un Nice to have en este punto. Un programador solo tiene que tomar una tarea de la primera columna y hacer click.

3. **La exclusión de la que menos seguro estoy:**
Bloquear una tarea para que nadie más la coja. Se contradicen dos cosas: lo barato y suficiente para validar (ver que la tarea ya está cogida debería bastar) contra mi desconfianza de que todo el equipo lo respete (bad players en el equipo de devs).
Entraría si, en la semana de prueba, aparece aunque sea un caso de dos personas en curso sobre la misma tarea a pesar de verla cogida: significaría que la visibilidad no basta y hace falta una regla.
