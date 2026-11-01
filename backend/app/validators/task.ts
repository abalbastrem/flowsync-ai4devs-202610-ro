import { TASK_STATUSES } from '#models/task'
import vine from '@vinejs/vine'
import type { FieldContext } from '@vinejs/vine/types'

const title = () => vine.string().trim().minLength(1).maxLength(255)

/**
 * `.optional()` alone also accepts null, and the body parser turns empty
 * strings into null: a blank field would be ignored instead of rejected.
 */
const wasSent = (field: FieldContext) => Object.hasOwn(field.parent, field.name)

/**
 * Validator to use when creating a task
 */
export const createTaskValidator = vine.create({
  title: title(),
})

/**
 * Validator to use when updating a task: only the fields sent change
 */
export const updateTaskValidator = vine.create({
  title: title().optional().requiredWhen(wasSent),
  status: vine.enum(TASK_STATUSES).optional().requiredWhen(wasSent),
  dueDate: vine
    .date({ formats: ['YYYY-MM-DD'] })
    .nullable()
    .optional(),
})
