/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

router.get('/', () => {
  return { hello: 'world' }
})

router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store'])
        router.post('login', [controllers.AccessTokens, 'store'])
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])
        router.post('visits', [controllers.Visits, 'store'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())

    router
      .group(() => {
        router.get('/', [controllers.Tasks, 'index'])
        router.post('/', [controllers.Tasks, 'store'])
        router.post(':id/take', [controllers.Tasks, 'take'])
        router.patch(':id', [controllers.Tasks, 'update'])
        router.delete(':id', [controllers.Tasks, 'destroy'])
      })
      .prefix('tasks')
      .as('tasks')
      .use(middleware.auth())
  })
  .prefix('/api/v1')
