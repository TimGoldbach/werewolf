import { catalogTexts, DEFAULT_LOCALE, isLocale, type Locale } from '@werewolf/shared'
import { getLocale } from 'next-intl/server'

/** For async server components, which cannot use the hooks in ./texts. */
export async function getAppLocale(): Promise<Locale> {
  const locale = await getLocale()
  return isLocale(locale) ? locale : DEFAULT_LOCALE
}

export async function getCatalog() {
  return catalogTexts(await getAppLocale())
}
