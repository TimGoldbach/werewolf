import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { Nav } from '@/components/nav'
import { Icon } from '@/components/pixel/icons'
import { SiteFooter } from '@/components/site-footer'
import { isAuthenticated, serverFetch } from '@/lib/server-api'
import { SESSION_EXPIRED_PATH } from '@/lib/session'

export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  // Not straight to /login: the invalid cookie has to go first, otherwise the middleware sends us back to /.
  if (!(await isAuthenticated())) redirect(SESSION_EXPIRED_PATH)
  const t = await getTranslations('testMode')
  const testMode = await serverFetch<{ active: boolean }>('/test-mode').catch(() => ({ active: false }))

  return (
    <div className="min-h-screen">
      <Nav />
      {testMode.active && (
        <div className="flex items-center justify-center gap-2 bg-amber-500/15 px-4 py-1.5 text-center text-xs font-medium text-amber-300">
          <Icon name="potion-poison" size={14} /> {t('banner')}
        </div>
      )}
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      <SiteFooter />
    </div>
  )
}
