import { TASK_STATUSES } from '#models/task'
import vine from '@vinejs/vine'

/**
 * Validator to use when creating a task
 */
export const createTaskValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(255),
})

/**
 * Validator to use when changing a task's status
 */
export const updateTaskStatusValidator = vine.create({
  status: vine.enum(TASK_STATUSES),
})
