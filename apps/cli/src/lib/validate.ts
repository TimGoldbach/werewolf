// Input validation shared by prompts and flags. Validators return a problem code (translated
// by the caller) or undefined when the value is fine.

export type Problem =
  | 'required'
  | 'tooLong'
  | 'lineBreak'
  | 'domain'
  | 'domainWithScheme'
  | 'port'
  | 'network'
  | 'timeZone'
  | 'url'
  | 'passwordShort'
  | 'passwordLong'
  | 'retention'

export const MAX_GROUP_NAME = 60
export const MAX_TAGLINE = 120
export const MIN_PASSWORD = 8
/** bcrypt ignores everything after 72 bytes. */
export const MAX_PASSWORD_BYTES = 72

export function validateGroupName(value: string): Problem | undefined {
  if (!value.trim()) return 'required'
  return validateText(value, MAX_GROUP_NAME)
}

export function validateTagline(value: string): Problem | undefined {
  return validateText(value, MAX_TAGLINE)
}

function validateText(value: string, max: number): Problem | undefined {
  if (/[\r\n]/.test(value)) return 'lineBreak'
  if ([...value.trim()].length > max) return 'tooLong'
  return undefined
}

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/

export function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, '')
}

export function validateDomain(value: string): Problem | undefined {
  const domain = normalizeDomain(value)
  if (!domain) return 'required'
  if (/^[a-z]+:\/\//.test(domain) || /[/:]/.test(domain)) return 'domainWithScheme'
  if (domain.length > 253) return 'domain'
  const labels = domain.split('.')
  if (!labels.every((label) => LABEL.test(label))) return 'domain'
  // A bare word only makes sense for localhost (Caddy then uses its local CA).
  if (labels.length === 1 && domain !== 'localhost') return 'domain'
  return undefined
}

export function parsePort(value: string | number): number | undefined {
  const port = typeof value === 'number' ? value : Number(String(value).trim())
  return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : undefined
}

export function validatePort(value: string): Problem | undefined {
  return parsePort(value) === undefined ? 'port' : undefined
}

export function validateNetworkName(value: string): Problem | undefined {
  if (!value.trim()) return 'required'
  return /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(value.trim()) ? undefined : 'network'
}

export function validateTimeZone(value: string): Problem | undefined {
  if (!value.trim()) return 'required'
  try {
    new Intl.DateTimeFormat('en', { timeZone: value.trim() })
    return undefined
  } catch {
    return 'timeZone'
  }
}

/** Optional URL: empty is fine, otherwise it has to be http(s). */
export function validateOptionalUrl(value: string): Problem | undefined {
  if (!value.trim()) return undefined
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? undefined : 'url'
  } catch {
    return 'url'
  }
}

export function validatePassword(value: string): Problem | undefined {
  if (/[\r\n]/.test(value)) return 'lineBreak'
  if (value.length < MIN_PASSWORD) return 'passwordShort'
  if (Buffer.byteLength(value, 'utf8') > MAX_PASSWORD_BYTES) return 'passwordLong'
  return undefined
}

export const MAX_RETENTION_DAYS = 3650

export function parseRetention(value: string): number | undefined {
  const days = Number(value.trim())
  return Number.isInteger(days) && days >= 1 && days <= MAX_RETENTION_DAYS ? days : undefined
}

export function validateRetention(value: string): Problem | undefined {
  return parseRetention(value) === undefined ? 'retention' : undefined
}
