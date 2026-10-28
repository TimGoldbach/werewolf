'use client'

import { isApiErrorCode, type ApiErrorCode } from '@werewolf/shared'
import { useTranslations } from 'next-intl'
import { useCallback } from 'react'

export class ClientApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Machine-readable error code from the API, if it sent one */
    public code?: ApiErrorCode,
  ) {
    super(message)
  }
}

/** Fetch against /api/* (same-origin, proxied to the Nest API via a Next rewrite). */
export async function clientFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    let code: ApiErrorCode | undefined
    try {
      const body = await res.json()
      message = body?.message ?? message
      if (isApiErrorCode(body?.code)) code = body.code
    } catch {
      /* ignore */
    }
    throw new ClientApiError(res.status, message, code)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

/**
 * Turns a caught error into text for the UI: the translation of the API's error code,
 * otherwise the given fallback (or a generic "unknown error").
 */
export function useErrorText(): (error: unknown, fallback?: string) => string {
  const t = useTranslations('errors')
  return useCallback(
    (error, fallback) => {
      if (error instanceof ClientApiError && error.code) return t(error.code)
      if (error instanceof TypeError) return t('network')
      return fallback ?? t('unknown')
    },
    [t],
  )
}
