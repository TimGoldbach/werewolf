'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { BrandIcon, useAppName } from '@/components/branding'
import { clientFetch } from '@/lib/client-api'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/leaderboard', labelKey: 'leaderboard' },
  { href: '/players', labelKey: 'players' },
  { href: '/games', labelKey: 'games' },
  { href: '/stats', labelKey: 'stats' },
  { href: '/roles', labelKey: 'roles' },
] as const

export function Nav() {
  const t = useTranslations('nav')
  const appName = useAppName()
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await clientFetch('/auth/logout', { method: 'POST' }).catch(() => undefined)
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3">
        <Link href="/" aria-label={t('home')} className="flex shrink-0 items-center gap-2">
          <BrandIcon size={22} />
          <span className="hidden font-pixel text-xs text-foreground sm:inline">{appName}</span>
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto">
          {LINKS.map((l) => {
            const active = pathname.startsWith(l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  active ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t(l.labelKey)}
              </Link>
            )
          })}
          <button
            onClick={logout}
            aria-label={t('logout')}
            className="ml-1 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </nav>
      </div>
    </header>
  )
}
