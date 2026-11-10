import vine from '@vinejs/vine'

/**
 * Validator to use when creating a task. Only the title is accepted: the
 * assignee and the status are always set by the server.
 */
export const createTaskValidator = vine.create({
  title: vine.string().trim(),
})
