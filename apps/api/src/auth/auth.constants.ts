import type { CookieOptions } from 'express'

export const SESSION_COOKIE = 'werewolf_session'
export const IS_PUBLIC_KEY = 'isPublic'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export function sessionCookieOptions(isProd: boolean): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: THIRTY_DAYS_MS,
  }
}
