import { DEFAULT_LOCALE, isLocale, type Locale } from '@werewolf/shared'

/** Cookie that stores the language a visitor picked (read by next-intl's request config). */
export const LOCALE_COOKIE = 'NEXT_LOCALE'

/** The instance's default language: `DEFAULT_LOCALE` from the environment, else English. */
export function instanceLocale(): Locale {
  const configured = process.env.DEFAULT_LOCALE
  return isLocale(configured) ? configured : DEFAULT_LOCALE
}

/** Time zone the group plays in (`TIME_ZONE`, IANA name), used for dates and day/night. */
export function instanceTimeZone(): string {
  return process.env.TIME_ZONE || 'UTC'
}
