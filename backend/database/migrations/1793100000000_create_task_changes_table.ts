import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'task_changes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('actor_id').unsigned().nullable().references('users.id').onDelete('SET NULL')
      // A copy of the title, not a reference: a change outlives its task.
      table.string('task_title').notNullable()
      table
        .enum('kind', ['created', 'title', 'taken', 'status', 'due_date', 'deleted'])
        .notNullable()
      table.string('old_value').nullable()
      table.string('new_value').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
