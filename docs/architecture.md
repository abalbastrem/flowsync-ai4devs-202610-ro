# Arquitectura

Diagrama de contenedores (nivel 2 de C4) de FlowSync, sacado del código. Una persona del equipo usa una SPA de React que corre en su navegador. La SPA guarda el token de sesión en `localStorage` y habla con la API de AdonisJS por HTTP con JSON, enviando ese token como `Bearer`. La API valida cada petición con VineJS, lee y escribe con Lucid en un fichero SQLite, y devuelve las respuestas envueltas en `{ data }` a través de los transformers.

```mermaid
C4Container
  title FlowSync: diagrama de contenedores

  Person(member, "Miembro del equipo", "Se registra, inicia sesión, ve la lista de tareas del equipo y crea tareas")

  Container_Boundary(browser, "Navegador") {
    Container(spa, "SPA", "React 19, React Router, Vite", "Pantallas /login, /register, / (tareas) y /profile. src/lib/api.ts es el único punto de contacto con la API")
    ContainerDb(storage, "localStorage", "Almacenamiento del navegador", "Token de acceso bajo la clave flowsync.token")
  }

  Container_Boundary(server, "Servidor") {
    Container(api, "API", "AdonisJS 7, Node.js", "Rutas /api/v1: auth/signup, auth/login, account/profile, account/logout, tasks (GET y POST). Controladores, validadores de VineJS, modelos de Lucid (User, Task) y transformers (UserTransformer, TaskTransformer)")
    ContainerDb(db, "Base de datos", "SQLite (better-sqlite3), fichero tmp/db.sqlite3", "Tablas users, auth_access_tokens y tasks")
  }

  Rel(member, spa, "Usa")
  Rel(spa, storage, "Guarda y lee el token")
  Rel(spa, api, "Llama", "HTTP, JSON, Authorization: Bearer")
  Rel(api, db, "Lee y escribe", "Lucid ORM")
```

Notas:

- **Autenticación:** el guard por defecto es `api`, con tokens de acceso opacos que se guardan en `auth_access_tokens`. El guard de sesión (`web`) está configurado pero ninguna ruta lo usa, así que no aparece en el diagrama.
- **Rutas protegidas:** las de `account` y `tasks` llevan el middleware `auth`. Las de `auth` (registro e inicio de sesión) son públicas.
- **Base de datos de los E2E:** los E2E usan otro fichero, `tmp/e2e.sqlite3` (variable `DB_FILE`). Es la misma base de datos con otro fichero, no otro contenedor.
