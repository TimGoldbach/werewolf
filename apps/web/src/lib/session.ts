/** Session cookie set by the API on /auth/login (name as in apps/api/src/auth/auth.constants.ts). */
export const SESSION_COOKIE = 'werewolf_session'

/** Route handler that deletes an invalid session cookie and then redirects to /login. */
export const SESSION_EXPIRED_PATH = '/session-expired'
