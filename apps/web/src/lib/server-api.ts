import type { RoleVisibility } from '@werewolf/shared'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_EXPIRED_PATH } from './session'

const API = process.env.API_INTERNAL_URL || 'http://localhost:3001'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

/**
 * Fetch against the internal Nest API from server components, forwarding the cookie.
 * On 401 (invalid session) it redirects, as the layout does, instead of throwing: pages render in
 * parallel with the layout and would otherwise be logged as server errors before its redirect.
 */
export async function serverFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const cookie = headers().get('cookie') ?? ''
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', cookie, ...(init?.headers ?? {}) },
    cache: 'no-store',
  })
  if (res.status === 401) redirect(SESSION_EXPIRED_PATH)
  if (!res.ok) {
    throw new ApiError(res.status, `API ${path} → ${res.status}`)
  }
  return res.json() as Promise<T>
}

/** API errors (e.g. unreachable) deliberately throw: an outage must not lead to the session being deleted. */
export async function isAuthenticated(): Promise<boolean> {
  const data = await serverFetch<{ authenticated: boolean }>('/auth/session')
  return data.authenticated
}

/**
 * Roles the group has hidden (public endpoint, so the rules page can use it too). Hiding only
 * tidies up lists: if the query fails, every role stays visible.
 */
export async function fetchHiddenRoleIds(): Promise<string[]> {
  return serverFetch<RoleVisibility>('/role-visibility')
    .then((v) => v.hiddenRoleIds)
    .catch((): string[] => [])
}
