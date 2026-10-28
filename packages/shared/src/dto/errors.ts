/**
 * Machine-readable error codes. The API answers errors with `{ code, message }`: the web
 * app shows a translated text for `code`, `message` is an English fallback for logs and
 * other API clients.
 */
export const API_ERROR_CODES = [
  'NOT_AUTHENTICATED',
  'WRONG_PASSWORD',
  'VALIDATION_FAILED',
  'PLAYER_NOT_FOUND',
  'PLAYER_NAME_TAKEN',
  'UNKNOWN_PLAYERS',
  'DUPLICATE_PLAYERS',
  'UNKNOWN_ROLES',
  'GAME_NOT_FOUND',
  'GAME_NOT_FINISHED',
  'GAME_ALREADY_FINISHED',
  'UNKNOWN_EVENT_TYPE',
  'TEST_MODE_REQUIRED',
] as const
export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

export interface ApiErrorBody {
  code: ApiErrorCode
  message: string
  details?: unknown
}

export function apiError(code: ApiErrorCode, message: string, details?: unknown): ApiErrorBody {
  return details === undefined ? { code, message } : { code, message, details }
}

export function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === 'string' && (API_ERROR_CODES as readonly string[]).includes(value)
}
