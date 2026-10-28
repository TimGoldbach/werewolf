'use client'

import { LOCALE_NAMES, LOCALES, type Locale } from '@werewolf/shared'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { LOCALE_COOKIE } from '@/i18n/config'
import { useAppLocale } from '@/lib/texts'
import { cn } from '@/lib/utils'

/** Per-device language choice; stored in a cookie and applied by re-rendering on the server. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations('common')
  const current = useAppLocale()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function choose(locale: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`
    startTransition(() => router.refresh())
  }

  return (
    <span role="group" aria-label={t('language')} className={cn('inline-flex gap-1', className)}>
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          disabled={pending}
          aria-pressed={locale === current}
          onClick={() => choose(locale)}
          className={cn(
            'rounded px-1.5 py-0.5 transition-colors hover:text-foreground',
            locale === current && 'text-foreground underline underline-offset-4',
          )}
        >
          {LOCALE_NAMES[locale]}
        </button>
      ))}
    </span>
  )
}
