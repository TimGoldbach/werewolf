import type { EnvValues } from './env-file.ts'

export const LOCALES = ['de', 'en'] as const
export type Locale = (typeof LOCALES)[number]

/** Accent presets with the primary colour the web app uses for them (terminal previews only). */
export const ACCENTS = {
  violet: '#9952e0',
  blood: '#db334a',
  moon: '#fbd760',
  forest: '#34b262',
  amber: '#f98c1f',
  silver: '#aeb4c2',
} as const
export type Accent = keyof typeof ACCENTS
export const ACCENT_NAMES = Object.keys(ACCENTS) as Accent[]
export const DEFAULT_ACCENT: Accent = 'violet'

export const MODES = ['domain', 'proxy', 'lan'] as const
export type Mode = (typeof MODES)[number]
export const PROXY_VIA = ['port', 'network'] as const
export type ProxyVia = (typeof PROXY_VIA)[number]

export const COMPOSE_CORE = 'docker-compose.yml'
export const OVERLAYS = {
  caddy: 'compose/caddy.yml',
  port: 'compose/port.yml',
  network: 'compose/proxy-network.yml',
} as const

export const DEFAULT_WEB_PORT = 8080
export const DEFAULT_RETENTION_DAYS = 14

/** Everything the setup asks for, except the password and the logo file. */
export interface Settings {
  locale: Locale
  groupName: string
  tagline: string
  accent: Accent
  mode: Mode
  /** Public domain: required for mode "domain", optional for "proxy" (only shown as the URL). */
  domain: string
  proxyVia: ProxyVia
  webPort: number
  proxyNetwork: string
  timeZone: string
  imprintUrl: string
  backupRetentionDays: number
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

export function isAccent(value: string): value is Accent {
  return Object.hasOwn(ACCENTS, value)
}

export function isMode(value: string): value is Mode {
  return (MODES as readonly string[]).includes(value)
}

export function isProxyVia(value: string): value is ProxyVia {
  return (PROXY_VIA as readonly string[]).includes(value)
}

/** The env keys a Settings value maps to. Keys of other modes are reset so the file stays tidy. */
export function settingsToEnv(settings: Settings): EnvValues {
  const env: EnvValues = {
    DEFAULT_LOCALE: settings.locale,
    GROUP_NAME: settings.groupName,
    GROUP_TAGLINE: settings.tagline,
    ACCENT_COLOR: settings.accent,
    TIME_ZONE: settings.timeZone,
    IMPRINT_URL: settings.imprintUrl,
    BACKUP_RETENTION_DAYS: String(settings.backupRetentionDays),
    DOMAIN: settings.mode === 'lan' ? '' : settings.domain,
    PROXY_NETWORK: '',
    WEB_BIND: '0.0.0.0',
    WEB_PORT: String(settings.webPort),
  }
  switch (settings.mode) {
    case 'domain':
      env.COMPOSE_FILE = composeFile(OVERLAYS.caddy)
      env.SECURE_COOKIES = 'true'
      break
    case 'proxy':
      env.SECURE_COOKIES = 'true'
      if (settings.proxyVia === 'network') {
        env.COMPOSE_FILE = composeFile(OVERLAYS.network)
        env.PROXY_NETWORK = settings.proxyNetwork
      } else {
        env.COMPOSE_FILE = composeFile(OVERLAYS.port)
        env.WEB_BIND = '127.0.0.1'
      }
      break
    case 'lan':
      env.COMPOSE_FILE = composeFile(OVERLAYS.port)
      env.SECURE_COOKIES = 'false'
      break
  }
  return env
}

export function settingsFromEnv(env: EnvValues): Settings {
  const files = (env.COMPOSE_FILE ?? '').split(':')
  let mode: Mode = 'lan'
  let proxyVia: ProxyVia = 'port'
  if (files.includes(OVERLAYS.caddy)) mode = 'domain'
  else if (files.includes(OVERLAYS.network)) {
    mode = 'proxy'
    proxyVia = 'network'
  } else if (env.WEB_BIND === '127.0.0.1') mode = 'proxy'
  const port = Number.parseInt(env.WEB_PORT ?? '', 10)
  const retention = Number.parseInt(env.BACKUP_RETENTION_DAYS ?? '', 10)
  return {
    locale: isLocale(env.DEFAULT_LOCALE ?? '') ? (env.DEFAULT_LOCALE as Locale) : 'en',
    groupName: env.GROUP_NAME ?? '',
    tagline: env.GROUP_TAGLINE ?? '',
    accent: isAccent(env.ACCENT_COLOR ?? '') ? (env.ACCENT_COLOR as Accent) : DEFAULT_ACCENT,
    mode,
    domain: env.DOMAIN ?? '',
    proxyVia,
    webPort: Number.isInteger(port) && port > 0 ? port : DEFAULT_WEB_PORT,
    proxyNetwork: env.PROXY_NETWORK ?? '',
    timeZone: env.TIME_ZONE || 'UTC',
    imprintUrl: env.IMPRINT_URL ?? '',
    backupRetentionDays: retention > 0 ? retention : DEFAULT_RETENTION_DAYS,
  }
}

function composeFile(overlay: string): string {
  return `${COMPOSE_CORE}:${overlay}`
}
