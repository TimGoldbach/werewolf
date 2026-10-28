import Link from 'next/link'
import { getFormatter, getTranslations } from 'next-intl/server'
import { roleName, winConditionText, type CatalogTexts, type WinCondition } from '@werewolf/shared'
import { Icon, RoleIcon } from '@/components/pixel/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { serverFetch } from '@/lib/server-api'
import { getCatalog } from '@/lib/texts.server'
import type { GameListItem } from '@/lib/types'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function winLabel(catalog: CatalogTexts, wc: WinCondition | null): string {
  return wc ? winConditionText(catalog, wc).label : '—'
}

export default async function GamesPage() {
  const t = await getTranslations('games')
  const catalog = await getCatalog()
  const format = await getFormatter()
  const games = await serverFetch<GameListItem[]>('/games')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('list.title')}</h1>
        <Link href="/games/new">
          <Button size="sm">{t('list.record')}</Button>
        </Link>
      </div>

      {games.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
          <Icon name="moon" size={40} />
          <p className="text-sm">{t('list.empty')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {games.map((g) => (
            <Link key={g.id} href={`/games/${g.id}`}>
              <Card className="transition-colors hover:bg-muted/40">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon name={g.mode === 'LIVE' ? 'moon' : 'sun'} size={16} />
                      <span className="font-medium">{formatDate(format, g.playedAt)}</span>
                      <Badge variant={g.mode === 'LIVE' ? 'default' : 'muted'}>
                        {g.mode === 'LIVE' ? t('mode.live') : t('mode.quick')}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t('list.summary', {
                        count: g.players.length,
                        win: winLabel(catalog, g.winningCondition),
                      })}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-0.5">
                      {g.players
                        .filter((p) => p.roleId)
                        .slice(0, 14)
                        .map((p) => (
                          <span key={p.id} title={`${p.player.displayName} — ${roleName(catalog, p.roleId!)}`}>
                            <RoleIcon roleId={p.roleId!} size={16} />
                          </span>
                        ))}
                    </div>
                  </div>
                  <span className="text-2xl">›</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
