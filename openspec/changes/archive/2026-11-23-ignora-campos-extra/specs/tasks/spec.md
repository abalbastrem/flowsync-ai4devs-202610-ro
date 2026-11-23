# Spec Delta

## MODIFIED Requirements


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
- **AND** no se crea ninguna tarea

#### Scenario: [SC-29] La API ignora los campos que no son el título
- **GIVEN** que tengo sesión iniciada
- **WHEN** envío por la API una petición de creación con un título y además un responsable y un estado
- **THEN** la respuesta es 201
- **AND** la tarea creada tiene como responsable a quien la creó y está en «Pendiente», sin tener en cuenta los campos enviados
