import type { Locale } from '@werewolf/shared'

export type { Messages } from './en'

export async function loadMessages(locale: Locale) {
  switch (locale) {
    case 'de':
      return (await import('./de')).default
    case 'en':
      return (await import('./en')).default
  }
}
