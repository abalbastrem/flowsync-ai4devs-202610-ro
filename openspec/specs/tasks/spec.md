# tasks Specification
## Purpose

El ciclo de vida de una tarea del equipo: cómo se crea, con qué valores nace y qué estados puede tener.

## Requirements

### Requirement: Se crea una tarea indicando solo el título
Una persona con sesión MUST poder crear una tarea indicando únicamente su título. El flujo de creación MUST NOT pedir ni sugerir ningún otro dato, como el responsable, el estado o una fecha.

#### Scenario: [SC-17] Un título basta
- **GIVEN** que he iniciado sesión y estoy en la lista
- **WHEN** escribo un título y creo la tarea
- **THEN** la tarea queda creada
- **AND** no he tenido que rellenar ningún otro dato

#### Scenario: [SC-18] El flujo de creación no ofrece más campos
- **GIVEN** que voy a crear una tarea
- **WHEN** recorro el flujo de creación entero
- **THEN** el título es lo único que se me pide
- **AND** no se me ofrece indicar responsable, estado, fecha ni ningún otro dato

#### Scenario: [SC-19] Creación por la API
- **GIVEN** que tengo sesión iniciada
- **WHEN** envío por la API una petición de creación que solo contiene un título
- **THEN** la respuesta es 201
- **AND** el cuerpo contiene la tarea creada con ese título

#### Scenario: [SC-20] Creación sin sesión
- **GIVEN** que no envío credenciales válidas
- **WHEN** envío por la API una petición de creación
- **THEN** la respuesta es 401

#### Scenario: [SC-29] La API ignora los campos que no son el título
- **GIVEN** que tengo sesión iniciada
- **WHEN** envío por la API una petición de creación con un título y además un responsable y un estado
- **THEN** la respuesta es 201
- **AND** la tarea creada tiene como responsable a quien la creó y está en «Pendiente», sin tener en cuenta los campos enviados

### Requirement: La tarea creada se ve sin recargar
Después de crear una tarea, quien la ha creado MUST verla en la lista sin recargar la página ni navegar a otra parte.

#### Scenario: [SC-21] Aparece en la lista al momento
- **GIVEN** que estoy en la lista
- **WHEN** termino de crear una tarea
- **THEN** la veo en la lista sin recargar ni navegar a ninguna otra parte

#### Scenario: [SC-28] Una carga más antigua no la hace desaparecer
- **GIVEN** que la lista todavía se está cargando
- **WHEN** creo una tarea y la respuesta de esa carga llega después
- **THEN** la tarea creada sigue en la lista

### Requirement: La tarea nace con quien la crea como responsable
Una tarea recién creada MUST tener como responsable a la persona que la ha creado, sin que esta haya seleccionado a nadie.

#### Scenario: [SC-22] Nace con mi nombre
- **GIVEN** que he iniciado sesión con el nombre «Ana García»
- **WHEN** creo una tarea indicando solo el título
- **THEN** la tarea aparece con «Ana García» como responsable

#### Scenario: [SC-23] La API asigna al autor
- **GIVEN** que tengo sesión iniciada
- **WHEN** creo una tarea por la API
- **THEN** la tarea de la respuesta, y la misma tarea en las consultas posteriores de la lista, tienen como responsable a la persona que la creó

### Requirement: La tarea nace en «Pendiente»
Una tarea recién creada MUST estar en el estado «Pendiente», sin que quien la crea lo haya elegido.

#### Scenario: [SC-24] Estado inicial
- **WHEN** creo una tarea indicando solo el título
- **THEN** la tarea queda en estado «Pendiente»

### Requirement: Solo existen tres estados fijos
Una tarea MUST estar siempre en exactamente uno de estos tres estados: «Pendiente», «En curso» o «Hecho». El producto MUST NOT ofrecer ninguna forma de añadir, renombrar ni eliminar estados.

#### Scenario: [SC-25] No se pueden configurar estados
- **GIVEN** que estoy en cualquier punto del producto
- **WHEN** busco la forma de añadir, renombrar o eliminar un estado
- **THEN** no existe ninguna

### Requirement: Si la creación falla, se explica y no se pierde lo escrito
Cuando una tarea no se pueda crear, la pantalla MUST explicar en castellano que no se ha podido crear, sin errores técnicos crudos, y MUST conservar el título escrito para poder intentarlo de nuevo.

#### Scenario: [SC-27] La creación falla
- **GIVEN** que he iniciado sesión y he escrito un título
- **WHEN** creo la tarea y el servidor falla
- **THEN** veo un mensaje en castellano que explica que no se ha podido crear
- **AND** el título sigue escrito en el campo y la lista no muestra ninguna tarea nueva
