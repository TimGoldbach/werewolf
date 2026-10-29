import { WIN_CONDITION_LIST } from '@werewolf/shared'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { BrandIcon } from '@/components/branding'
import { Icon } from '@/components/pixel/icons'
import { RoleGuide } from '@/components/rules/role-guide'
import { SiteFooter } from '@/components/site-footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getBranding } from '@/lib/branding'
import { fetchHiddenRoleIds } from '@/lib/server-api'
import { SESSION_COOKIE } from '@/lib/session'
import { getCatalog } from '@/lib/texts.server'

export async function generateMetadata(): Promise<Metadata> {
  const [t, tc] = await Promise.all([getTranslations('rules'), getTranslations('common')])
  return {
    title: t('metaTitle', { appName: getBranding().name ?? tc('appName') }),
    description: t('metaDescription'),
  }
}

// Highlights a term inside a rules sentence (`<hl>…</hl>` in the messages).
const hl = (chunks: React.ReactNode) => <span className="text-foreground">{chunks}</span>

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  )
}

/**
 * Public short version of the game rules — reachable without the group password. Win conditions
 * and roles come straight from the catalogue in @werewolf/shared, so text and game logic don't
 * drift apart. Roles the group has hidden are left out of the role guide.
 */
export default async function RulesPage() {
  const [t, tc, catalog, hiddenRoleIds] = await Promise.all([
    getTranslations('rules'),
    getTranslations('common'),
    getCatalog(),
    fetchHiddenRoleIds(),
  ])
  const appName = getBranding().name ?? tc('appName')
  // Only for the link target: without a session, "/" goes to the login via the middleware anyway.
  const loggedIn = (await cookies()).has(SESSION_COOKIE)

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3">
          <span className="flex items-center gap-2">
            <BrandIcon size={22} />
            <span className="font-pixel text-xs text-foreground">{appName}</span>
          </span>
          <Link
            href={loggedIn ? '/' : '/login'}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {loggedIn ? t('toApp') : t('toLogin')}
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Icon name="book" size={26} /> {t('title')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('intro')}</p>
        </div>

        <Section title={t('about.title')}>
          <p>{t('about.intro')}</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>{t.rich('about.village', { hl })}</li>
            <li>{t.rich('about.werewolves', { hl })}</li>
            <li>{t.rich('about.loners', { hl })}</li>
            <li>{t.rich('about.ambiguous', { hl })}</li>
          </ul>
        </Section>

        <Section title={t('setup.title')}>
          <ul className="list-disc space-y-1 pl-5">
            <li>{t.rich('setup.moderator', { hl })}</li>
            <li>{t('setup.cards')}</li>
            <li>{t('setup.recommendation')}</li>
          </ul>
        </Section>

        <Section title={t('night.title')}>
          <ul className="list-disc space-y-1 pl-5">
            <li>{t('night.sleep')}</li>
            <li>{t('night.act')}</li>
            <li>{t('night.firstNight')}</li>
            <li>{t('night.wolves')}</li>
          </ul>
        </Section>

        <Section title={t('day.title')}>
          <ul className="list-disc space-y-1 pl-5">
            <li>{t('day.wake')}</li>
            <li>{t.rich('day.mayor', { hl })}</li>
            <li>{t('day.vote')}</li>
            <li>{t('day.nextNight')}</li>
            <li>{t('day.startWithDay')}</li>
          </ul>
        </Section>

        <Section title={t('death.title')}>
          <ul className="list-disc space-y-1 pl-5">
            <li>{t('death.triggers')}</li>
            <li>{t('death.cupid')}</li>
            <li>{t('death.lovers')}</li>
          </ul>
        </Section>

        <Section title={t('win.title')}>
          <p>{t('win.tieBreak')}</p>
          <ul className="flex flex-col divide-y divide-border/60">
            {WIN_CONDITION_LIST.map((w) => (
              <li key={w.id} className="py-1.5">
                <span className="font-medium text-foreground">{catalog.winConditions[w.id].label}</span> —{' '}
                {catalog.winConditions[w.id].description}
              </li>
            ))}
          </ul>
        </Section>

        <Section title={t('table.title')}>
          <ul className="list-disc space-y-1 pl-5">
            <li>{t('table.cards')}</li>
            <li>{t('table.night')}</li>
            <li>{t('table.dead')}</li>
          </ul>
        </Section>

        <section className="flex flex-col gap-3 pt-2">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Icon name="crystal" size={22} /> {t('allRoles')}
          </h2>
          <RoleGuide hiddenRoleIds={hiddenRoleIds} />
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
