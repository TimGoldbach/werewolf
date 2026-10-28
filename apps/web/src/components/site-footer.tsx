import { unstable_noStore as noStore } from 'next/cache'
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from '@/components/language-switcher'
import { cn } from '@/lib/utils'

/**
 * Footer with the language switcher and an optional imprint link. The URL comes from
 * `IMPRINT_URL` at runtime so the same image works for every instance — noStore()
 * keeps Next from baking it in at build time.
 */
export function SiteFooter({ className }: { className?: string }) {
  noStore()
  const t = useTranslations('common')
  const imprintUrl = process.env.IMPRINT_URL

  return (
    <footer
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-4 text-xs text-muted-foreground',
        className,
      )}
    >
      <LanguageSwitcher />
      {imprintUrl && (
        <a
          href={imprintUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-foreground"
        >
          {t('imprint')}
        </a>
      )}
    </footer>
  )
}
