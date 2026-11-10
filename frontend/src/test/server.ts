import { setupServer } from 'msw/node'

/**
 * Servidor de MSW compartido por todos los tests. Cada test declara sus
 * propios handlers con `server.use(...)`: no hay respuestas por defecto, así
 * que cualquier petición no prevista falla en vez de pasar en silencio.
 */
export const server = setupServer()

/** Base de la API tal como la ve `lib/api.ts` en los tests. */
export const API = 'http://localhost:3333/api/v1'
