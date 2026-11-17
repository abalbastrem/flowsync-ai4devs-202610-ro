# Spec Delta

## ADDED Requirements

### Requirement: Si la creación falla, se explica y no se pierde lo escrito
Cuando una tarea no se pueda crear, la pantalla MUST explicar en castellano que no se ha podido crear, sin errores técnicos crudos, y MUST conservar el título escrito para poder intentarlo de nuevo.

#### Scenario: [SC-27] La creación falla
- **GIVEN** que he iniciado sesión y he escrito un título
- **WHEN** creo la tarea y el servidor falla
- **THEN** veo un mensaje en castellano que explica que no se ha podido crear
- **AND** el título sigue escrito en el campo y la lista no muestra ninguna tarea nueva

## MODIFIED Requirements

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
