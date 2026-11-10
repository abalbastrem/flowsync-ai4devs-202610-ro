# task-list Specification
## Purpose

La lista compartida del equipo: una sola vista con todas las tareas del espacio, la misma para todos, que responde de un vistazo quién está en qué y qué hay libre.

## Requirements

### Requirement: La lista es la misma para todos los miembros
La lista MUST mostrar todas las tareas del espacio a cualquier persona registrada, sin que el contenido dependa de quién mira, de quién creó la tarea ni de ningún rol. MUST NOT existir tareas privadas.

#### Scenario: Dos personas ven el mismo conjunto de tareas
- **GIVEN** que el espacio tiene tareas creadas por distintas personas
- **WHEN** dos personas registradas distintas consultan la lista
- **THEN** las dos reciben exactamente el mismo conjunto de tareas

#### Scenario: La tarea que otra persona se asigna es visible
- **GIVEN** que otra persona ha creado una tarea, de la que es responsable
- **WHEN** consulto la lista
- **THEN** esa tarea aparece en ella

#### Scenario: Ver la lista no requiere ningún permiso especial
- **GIVEN** que soy una persona registrada cualquiera
- **WHEN** consulto la lista
- **THEN** la recibo entera, igual que cualquier otro miembro

### Requirement: Hay una sola lista de tareas
El producto MUST ofrecer una única vista de tareas. MUST NOT existir una vista «mis tareas» ni ninguna otra lista separada de la del equipo.

#### Scenario: No hay vista personal
- **GIVEN** que he iniciado sesión
- **WHEN** busco en la aplicación otras vistas de tareas
- **THEN** la única vista de tareas que encuentro es la lista del equipo

### Requirement: Cada fila muestra título, responsable y estado
Cada tarea de la lista MUST mostrar su título, quién la lleva y su estado, sin que haya que abrirla. El estado MUST aparecer con su nombre: «Pendiente», «En curso» o «Hecho».

#### Scenario: La fila basta para saber quién está en qué
- **GIVEN** que hay tareas con distintos responsables
- **WHEN** miro la lista
- **THEN** cada fila muestra el título, el responsable y el estado de su tarea
- **AND** puedo decir en qué trabaja cada miembro sin abrir ninguna tarea

#### Scenario: La consulta de la API devuelve los tres datos
- **GIVEN** que hay tareas en el espacio
- **WHEN** una persona con sesión consulta la lista por la API
- **THEN** la respuesta es 200
- **AND** cada tarea del cuerpo incluye su título, su estado y los datos con que se identifica a su responsable

### Requirement: El responsable se identifica por su nombre
La lista MUST identificar al responsable por su nombre. Si la persona no tiene nombre, MUST identificarla por sus iniciales. La lista MUST NOT mostrar su email ni ningún identificador interno, y la API MUST NOT incluir el email del responsable en la respuesta de la lista.

#### Scenario: Responsable con nombre
- **GIVEN** que la responsable de una tarea se registró con el nombre «Ana García»
- **WHEN** miro esa fila
- **THEN** veo «Ana García» como responsable

#### Scenario: Responsable sin nombre
- **GIVEN** que el responsable de una tarea se registró sin nombre
- **WHEN** miro esa fila
- **THEN** veo sus iniciales como responsable
- **AND** no veo su email

#### Scenario: La API no expone el email del responsable
- **WHEN** una persona con sesión consulta la lista por la API
- **THEN** ninguna tarea del cuerpo incluye el email de su responsable

### Requirement: Las tareas más recientes van primero
La lista MUST ordenar las tareas por fecha de creación, de la más reciente a la más antigua.

#### Scenario: Orden por creación
- **GIVEN** que se crearon las tareas «A», «B» y «C», en ese orden
- **WHEN** consulto la lista
- **THEN** aparecen en el orden «C», «B», «A»

### Requirement: La lista no muestra fechas ni presencia
La lista MUST NOT mostrar fechas, marcas de vencimiento ni ninguna señal de presencia o de actividad por persona, como quién está conectado o cuándo actuó alguien por última vez.

#### Scenario: Sin fechas en la fila
- **WHEN** miro la lista
- **THEN** ninguna fila muestra una fecha ni una marca de tarea vencida

#### Scenario: Sin señales de presencia
- **GIVEN** que otras personas del equipo están usando la aplicación a la vez que yo
- **WHEN** miro la lista
- **THEN** no veo quién está en línea ni ninguna actividad por persona

### Requirement: La lista vacía explica qué es y ofrece crear la primera tarea
Cuando el espacio no tiene ninguna tarea, la pantalla MUST explicar qué es la lista y ofrecer crear la primera tarea, en lugar de mostrar una lista vacía sin más.

#### Scenario: Espacio sin tareas
- **GIVEN** que en el espacio no se ha creado ninguna tarea
- **WHEN** abro la lista
- **THEN** veo un texto que explica qué es esta lista
- **AND** se me ofrece crear la primera tarea

### Requirement: La lista exige haber iniciado sesión
La lista MUST estar disponible solo para personas con sesión iniciada.

#### Scenario: Consulta por la API sin sesión
- **GIVEN** que no envío credenciales válidas
- **WHEN** consulto la lista por la API
- **THEN** la respuesta es 401
- **AND** el cuerpo no contiene ninguna tarea

#### Scenario: Acceso a la pantalla sin sesión
- **GIVEN** que no he iniciado sesión
- **WHEN** intento abrir la lista en la aplicación
- **THEN** se me lleva a la pantalla de inicio de sesión
- **AND** no veo ninguna tarea

### Requirement: Consultar la lista no modifica nada
Consultar o recorrer la lista MUST NOT cambiar el estado, el responsable ni ningún otro dato de ninguna tarea.

#### Scenario: Mirar es inocuo
- **GIVEN** que hay tareas en varios estados
- **WHEN** consulto la lista varias veces
- **THEN** cada tarea conserva el mismo título, responsable y estado que tenía antes
