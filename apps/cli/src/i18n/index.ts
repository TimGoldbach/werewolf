import type { Locale } from '../lib/settings.ts'
import { de } from './de.ts'
import { en, type Messages } from './en.ts'

export type { Messages }

export const messages: Record<Locale, Messages> = { de, en }

/** Language from the usual locale variables, e.g. LANG=de_DE.UTF-8 → de. */
export function systemLocale(env: NodeJS.ProcessEnv = process.env): Locale {
  const value = env.LC_ALL || env.LC_MESSAGES || env.LANG || env.LANGUAGE || ''
  return value.toLowerCase().startsWith('de') ? 'de' : 'en'
}
