# 0002. La lista se actualiza consultando cada 3 s

**Estado:** aceptada · **Fecha:** 2026-11-02

## Contexto

FR-7 y NFR-1 piden que un cambio de otro usuario se vea en 5 s o menos, sin recargar. El equipo es de 3–10 personas, con hasta unas 200 tareas, y es un MVP para validar una hipótesis.

## Decisión

El navegador vuelve a pedir `GET /api/v1/tasks` cada 3 s mientras la pestaña está visible, y al momento cuando vuelve a estarlo. Si dos personas cambian la misma tarea, gana el último cambio.

## Por qué

- **No añade nada al servidor:** la sesión, los permisos y los errores funcionan igual que en cualquier otra petición.
- **Se recupera sola:** si se cae la red, la siguiente consulta lo arregla, sin lógica de reconexión.
- **Las cifras lo permiten.** Medido en local con 200 tareas, sobre los servidores de desarrollo:

| Medida | Mediana | Máximo |
|---|---|---|
| `GET /api/v1/tasks` (43 KB) | 79 ms | 112 ms |
| Cargar la página hasta ver la lista, en Edge | 635 ms | 900 ms |

Con 10 personas son unas 3,3 peticiones por segundo. La carga de la página también cumple NFR-5 (menos de 2 s con 200 tareas). Estas cifras no incluyen la latencia de una red real.

## Alternativas descartadas

- **Server-Sent Events:** avisa casi al instante, pero hace falta un canal de avisos en el servidor y una forma de autenticarlo, porque el `EventSource` del navegador no permite enviar la cabecera `Authorization`.
- **WebSockets:** como el anterior, y además da una comunicación en los dos sentidos que aquí no se usa.

## Consecuencias

- Un cambio tarda hasta 3 s en verse, más lo que dure la petición: entra en los 5 s, con poco margen si la red es muy lenta.
- Se hacen peticiones aunque no haya cambiado nada: unos 860 KB por minuto y persona con 200 tareas.
- Durante esos segundos la lista puede estar desactualizada: alguien puede coger una tarea que otra persona acaba de coger, sin que le salga la confirmación de FR-3.

## Cuándo revisarla

Si el equipo o la lista crecen mucho, si 3 s se quedan cortos en el uso real, o si pisarse por una lista desactualizada resulta ser un problema. Pasar a avisos del servidor solo afectaría a cómo se dispara el refresco de la lista, no al resto de la página.
