import { catalogTexts, DEFAULT_LOCALE, isLocale, stepTexts, type Locale } from '@werewolf/shared'
import { useLocale } from 'next-intl'

/** The active locale as a shared `Locale` (next-intl types it as a plain string). */
export function useAppLocale(): Locale {
  const locale = useLocale()
  return isLocale(locale) ? locale : DEFAULT_LOCALE
}

/** Role names and domain labels in the active language (client and server components). */
export function useCatalog() {
  return catalogTexts(useAppLocale())
}

/** Texts for the moderator script in the active language. */
export function useStepTexts() {
  return stepTexts(useAppLocale())
}
