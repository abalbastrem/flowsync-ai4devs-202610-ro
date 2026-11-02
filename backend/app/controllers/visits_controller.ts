import TaskChange from '#models/task_change'
import TaskChangeTransformer from '#transformers/task_change_transformer'
import type { HttpContext } from '@adonisjs/core/http'

export default class VisitsController {
  /**
   * Starts a new visit and returns what others changed since the previous one.
   */
  async store({ auth, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const lastSeen = user.lastSeenChangeId
    const newest = await TaskChange.query().orderBy('id', 'desc').first()
    const latest = newest?.id ?? 0

    // On the first visit there is nothing to catch up on.
    const changes =
      lastSeen === null
        ? []
        : await TaskChange.query()
            .where('id', '>', lastSeen)
            .where('id', '<=', latest)
            .where((query) => query.whereNull('actor_id').orWhereNot('actor_id', user.id))
            .preload('actor')
            .orderBy('id')

    user.lastSeenChangeId = latest
    await user.save()

    return serialize(TaskChangeTransformer.transform(changes))
  }
}
