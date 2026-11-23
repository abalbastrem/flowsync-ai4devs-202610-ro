/*
|--------------------------------------------------------------------------
| OpenAPI document (development only)
|--------------------------------------------------------------------------
|
| Metaproject code, not part of the product: it serves the OpenAPI document
| and its UI to browse the API while developing. They expose the whole route
| map, and the Scalar UI loads third-party code from a CDN, so they exist only
| in development.
|
*/

import app from '@adonisjs/core/services/app'
import openapi from '@foadonis/openapi/services/main'

if (app.inDev) {
  openapi.registerRoutes()
}
