# Prompts

Aquí van **todos los prompts que lanzaste** para hacer el ejercicio, en el orden en que los
lanzaste, con el modelo y la herramienta de cada uno.

Esto no es papeleo. Lo que se revisa es **cómo pediste las cosas**, no solo lo que salió: un
resultado flojo con un prompt bueno y un resultado flojo con un prompt vago necesitan feedback
distinto, y sin este archivo no se distinguen.

## Cómo rellenarlo

- Un apartado `## Prompt N` por cada prompt.
- **Pega el prompt tal cual lo lanzaste**, dentro del bloque de código, aunque ocupe diez líneas
  y aunque tenga faltas. No lo reescribas para que quede bien: el que arreglaste mentalmente
  después no es el que lanzaste.
- Incluye también los que **no funcionaron**. Suelen ser los más útiles de leer.
- `Modelo` y `Herramienta` en todos. Si cambiaste de una a otra a mitad, se nota aquí.

Borra el ejemplo de abajo cuando escribas el primero.

---
## Ticket de Jira
### FLOW-2
Make a login page with two text fields:

user
password

user accepts both the username and the email account the user registered with.

Additionally, add an “I forgot my password” link that will send user to another page detailed in the subtask.

### FLOW-3
Implement the page reached from the "I forgot my password" button. This page should allow the user to request a password reset using their email or account identifier, following the app's existing flow.

Upon completion, an email has to be sent to user email address.

## Prompt 1

**Modelo:** Opus 5.5 Medium
**Herramienta:** Claude Code

```
do the tasks in Jira project FlowSync, including a QA validation.
```

**Sin harness:**
15m 28s
240.1k
Tocó backend, creó una nueva columna en BBDD, a saco, ignorando las migraciones. En frontend, implementó un User Profile, puso un link para registrarse funcional, un logout, y comprobó errores como registrarse con un username existente

**Con harness:**
5m 20s
117.8k
El coste en tiempo ha sido un tercio y en fresh tokens, la mitad.
Ha hecho varios prompts para comprobar qué hacía en cuanto a backend. Ha hecho review de las capturas de QA. Me ha mostrado todos los escenarios de QA en un browser asegurándose de que yo los veía.
Ha implementado un User Profile y un logout. También propone registrarse con POST aprovechando que el backend tiene un endpoint para eso.
