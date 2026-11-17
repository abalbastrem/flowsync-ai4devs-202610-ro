# Spec Delta

## ADDED Requirements

### Requirement: Si la lista no se puede cargar, se explica y se puede reintentar
Cuando la lista no se pueda cargar, la pantalla MUST explicar en castellano qué ha pasado y qué hacer, sin errores técnicos crudos, y MUST ofrecer reintentarlo sin recargar la página.

#### Scenario: [SC-26] La carga falla y se reintenta
- **GIVEN** que he iniciado sesión y el servidor no responde
- **WHEN** abro la lista
- **THEN** veo un mensaje que explica que no se ha podido cargar y un botón «Reintentar»
- **AND** si pulso «Reintentar» cuando el servidor ya responde, veo la lista
