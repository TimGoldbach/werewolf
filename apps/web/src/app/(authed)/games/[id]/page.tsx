import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getFormatter, getTranslations } from 'next-intl/server'
import { roleName, winConditionText, type CatalogTexts, type Faction } from '@werewolf/shared'
import { RoleIcon } from '@/components/pixel/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { DeleteGameButton } from '@/components/delete-game-button'
import { SetFeedback } from '@/components/set-feedback'
import { ApiError, serverFetch } from '@/lib/server-api'
import { getAppLocale, getCatalog } from '@/lib/texts.server'
import type { GameListItem } from '@/lib/types'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function factionBadge(catalog: CatalogTexts, f: Faction | null) {
  if (!f) return null
  const variant = f === 'werewolves' ? 'werewolves' : f === 'solo' ? 'solo' : f === 'village' ? 'village' : 'muted'
  return <Badge variant={variant}>{catalog.factions[f]}</Badge>
}

export default async function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const t = await getTranslations('games')
  const catalog = await getCatalog()
  const locale = await getAppLocale()
  const format = await getFormatter()
  let game: GameListItem
  try {
    game = await serverFetch<GameListItem>(`/games/${id}`)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound()
    throw e
  }

  const sorted = [...game.players].sort((a, b) =>
    a.player.displayName.localeCompare(b.player.displayName, locale),
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <Link href="/games" className="text-sm text-muted-foreground hover:text-foreground">
          {t('detail.back')}
        </Link>
        <div className="flex items-center gap-2">
          {game.status === 'FINISHED' && (
            <>
              <Link href={`/games/new?copy=${game.id}`}>
                <Button variant="outline" size="sm">
                  {t('detail.copy')}
                </Button>
              </Link>
              <Link href={`/games/${game.id}/edit`}>
                <Button variant="secondary" size="sm">
                  {t('detail.edit')}
                </Button>
              </Link>
            </>
          )}
          <DeleteGameButton gameId={game.id} />
        </div>
      </div>

      {game.status === 'FINISHED' && (
        <SetFeedback gameId={game.id} playerCount={game.players.length} initial={game.setRating} />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {formatDate(format, game.playedAt)}
            <Badge variant={game.mode === 'LIVE' ? 'default' : 'muted'}>
              {game.mode === 'LIVE' ? t('mode.live') : t('mode.quick')}
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t.rich('detail.win', {
              win: game.winningCondition ? winConditionText(catalog, game.winningCondition).label : '—',
              value: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
            })}
            {game.moderator && <> · {t('detail.moderator', { name: game.moderator.displayName })}</>}
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>{t('detail.columns.player')}</TH>
                <TH>{t('detail.columns.role')}</TH>
                <TH>{t('detail.columns.faction')}</TH>
                <TH className="text-right">{t('detail.columns.result')}</TH>
              </TR>
            </THead>
            <TBody>
              {sorted.map((p) => (
                <TR key={p.id}>
                  <TD>
                    <span className="font-medium">{p.player.displayName}</span>
                  </TD>
                  <TD>
                    {p.roleId ? (
                      <span className="flex items-center gap-1.5">
                        <RoleIcon roleId={p.roleId} size={16} />
                        {roleName(catalog, p.roleId)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TD>
                  <TD>{factionBadge(catalog, p.finalFaction)}</TD>
                  <TD className="text-right">
                    {p.isWinner ? <Badge>{t('detail.won')}</Badge> : <span className="text-muted-foreground">—</span>}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          {game.notes && <p className="mt-4 text-sm text-muted-foreground">{game.notes}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
