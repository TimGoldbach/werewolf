import { catalog as deCatalog } from './de/catalog.js'
import { script as deScript } from './de/script.js'
import { catalog as enCatalog } from './en/catalog.js'
import { script as enScript } from './en/script.js'
import type { Locale } from './locale.js'
import type { CatalogTexts, ScriptTexts, StepTexts } from './types.js'

const CATALOG_TEXTS: Record<Locale, CatalogTexts> = { de: deCatalog, en: enCatalog }
const SCRIPT_TEXTS: Record<Locale, ScriptTexts> = { de: deScript, en: enScript }

export function catalogTexts(locale: Locale): CatalogTexts {
  return CATALOG_TEXTS[locale]
}

export function scriptTexts(locale: Locale): ScriptTexts {
  return SCRIPT_TEXTS[locale]
}

/** Catalog and script texts in one language, as the moderator script expects them. */
export function stepTexts(locale: Locale): StepTexts {
  return { catalog: CATALOG_TEXTS[locale], script: SCRIPT_TEXTS[locale] }
}
