import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Null until the first visit. An id rather than a time, so that nothing is
      // lost or repeated within the same second.
      table.integer('last_seen_change_id').unsigned().nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('last_seen_change_id')
    })
  }
}
