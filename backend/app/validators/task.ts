import vine from '@vinejs/vine'

/**
 * Validator to use when creating a task
 */
export const createTaskValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(255),
})
