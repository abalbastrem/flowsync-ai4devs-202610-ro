# Tasks

> Cada grupo corresponde a un requisito de `specs/`. Los tests van primero y deben fallar por el motivo esperado; si el comportamiento ya existe, se comprueba que el test detecta el fallo rompiendo el código un momento. En frontend: `cd frontend && npm test`.

## 1. Si la lista no se puede cargar, se explica y se puede reintentar (task-list)

- [ ] 1.1 Test de componente (Vitest + MSW): SC-26. La primera carga falla por red; se ve un mensaje que explica qué hacer, sin la palabra «backend», y «Reintentar»; al pulsarlo con el servidor ya disponible, aparece la lista. Verificación: falla porque el mensaje de conexión nombra el backend.
- [ ] 1.2 Implementación: el mensaje de falta de conexión explica qué hacer sin términos técnicos. Verificación: el test de 1.1 pasa.

## 2. Si la creación falla, se explica y no se pierde lo escrito (tasks)

- [ ] 2.1 Test de componente: SC-27. El alta responde con error; se ve el mensaje, el título sigue en el campo y la lista no cambia. Verificación: el comportamiento ya existe, así que se comprueba rompiéndolo un momento.
- [ ] 2.2 Implementación: ninguna, si 2.1 pasa. Verificación: el test de 2.1 pasa.

## 3. La tarea creada se ve sin recargar (tasks)

- [ ] 3.1 Test de componente: SC-28. Una carga retenida que llega después del alta no borra la tarea creada. Verificación: se comprueba rompiendo un momento el descarte de cargas antiguas.
- [ ] 3.2 Implementación: ninguna, si 3.1 pasa. Verificación: el test de 3.1 pasa.

## 4. Cierre

- [ ] 4.1 E2E: no hay pantalla nueva; los E2E de E3-1 y E2-1 siguen cubriendo el camino feliz.
- [ ] 4.2 Auditoría de cobertura: clasificar en `docs/trazabilidad/branches.json` las ramas sin cubrir que quedan (decididas por la persona), y `make matriz-check` en verde.
