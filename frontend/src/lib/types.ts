/**
 * Espejo de `UserTransformer` del backend (app/transformers/user_transformer.ts).
 */
export type User = {
  id: number
  fullName: string | null
  email: string
  initials: string
  createdAt: string
  updatedAt: string
}

/**
 * Respuesta de `POST /auth/signup` y `POST /auth/login`, ya sin el envoltorio `{ data }`.
 */
export type AuthResult = {
  user: User
  token: string
}

export type SignupPayload = {
  /** El backend lo declara `.nullable()`: la clave debe viajar siempre, aunque valga `null`. */
  fullName: string | null
  email: string
  password: string
  passwordConfirmation: string
}

export type LoginPayload = {
  email: string
  password: string
}

/**
 * Espejo de `AssigneeTransformer` del backend: el responsable viaja sin email.
 */
export type Assignee = {
  id: number
  fullName: string | null
  initials: string
}

export type TaskStatus = 'pending' | 'in_progress' | 'done'

/**
 * Espejo de `TaskChangeTransformer` del backend.
 */
export type TaskChange = {
  id: number
  kind: 'created' | 'title' | 'taken' | 'status' | 'due_date' | 'deleted'
  taskTitle: string
  oldValue: string | null
  newValue: string | null
  actor: Assignee | null
  createdAt: string
}

/**
 * Espejo de `TaskTransformer` del backend (app/transformers/task_transformer.ts).
 */
export type Task = {
  id: number
  title: string
  status: TaskStatus
  assignee: Assignee | null
  /** Un día sin hora: `YYYY-MM-DD`. */
  dueDate: string | null
  createdAt: string
  updatedAt: string | null
}
