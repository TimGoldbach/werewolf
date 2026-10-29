import Link from 'next/link'
import { roleName, WIN_CATEGORIES, type LeaderboardEntry, type Player, type PlayerRoleStat } from '@werewolf/shared'
import { getFormatter, getTranslations } from 'next-intl/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { serverFetch } from '@/lib/server-api'
import { getCatalog } from '@/lib/texts.server'
import { formatDecimal, formatPercent } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function PlayerStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const t = await getTranslations('playerStats')
  const catalog = await getCatalog()
  const format = await getFormatter()
  const [data, players] = await Promise.all([
    serverFetch<{ entry: LeaderboardEntry | null; roleStats: PlayerRoleStat[] }>(
      `/stats/players/${id}`,
    ),
    serverFetch<Player[]>('/players?includeArchived=true'),
  ])
  const name = players.find((p) => p.id === id)?.displayName ?? t('unknownPlayer')
  const { entry, roleStats } = data

  return (
    <div className="flex flex-col gap-6">
      <Link href="/leaderboard" className="text-sm text-muted-foreground hover:text-foreground">
        {t('back')}
      </Link>
      <h1 className="text-2xl font-bold">{name}</h1>

      {!entry ? (
        <p className="text-sm text-muted-foreground">{t('noGames')}</p>
      ) : (
        <>
          <Card>
            <CardContent className="grid grid-cols-2 gap-3 pt-5 sm:grid-cols-4">
              <Metric label={t('metrics.avgPoints')} value={formatDecimal(format, entry.pointsPerGame)} />
              <Metric label={t('metrics.games')} value={String(entry.games)} />
              <Metric label={t('metrics.wins')} value={String(entry.wins)} />
              <Metric label={t('metrics.rate')} value={formatPercent(entry.winRate)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('sources.title')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              {WIN_CATEGORIES.filter((c) => entry.winsByCategory[c] > 0).map((c) => (
                <ScoreRow
                  key={c}
                  label={t('sources.wins', { category: catalog.winCategories[c] })}
                  detail={`${entry.winsByCategory[c]}×`}
                  points={entry.pointsByCategory[c]}
                />
              ))}
              {entry.losses > 0 && <ScoreRow label={t('sources.losses')} detail={`${entry.losses}×`} points={0} />}
              <div className="mt-2 flex items-baseline justify-between border-t border-border pt-2">
                <span>{t('sources.total')}</span>
                <span className="tabular-nums">{entry.points}</span>
              </div>
              <div className="flex items-baseline justify-between font-semibold">
                <span>
                  {t('sources.avgPerGame')}{' '}
                  <span className="text-xs font-normal text-muted-foreground">
                    {entry.points} ÷ {entry.games}
                  </span>
                </span>
                <span className="tabular-nums">{formatDecimal(format, entry.pointsPerGame)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('byFaction.title')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge variant="village">
                {t('byFaction.village', {
                  rate: formatPercent(entry.byFaction.village.winRate),
                  games: entry.byFaction.village.games,
                })}
              </Badge>
              <Badge variant="werewolves">
                {t('byFaction.werewolves', {
                  rate: formatPercent(entry.byFaction.werewolves.winRate),
                  games: entry.byFaction.werewolves.games,
                })}
              </Badge>
              <Badge variant="solo">
                {t('byFaction.solo', {
                  rate: formatPercent(entry.byFaction.solo.winRate),
                  games: entry.byFaction.solo.games,
                })}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('byRole.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              {roleStats.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('byRole.empty')}</p>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>{t('byRole.role')}</TH>
                      <TH className="text-right">{t('byRole.games')}</TH>
                      <TH className="text-right">{t('byRole.wins')}</TH>
                      <TH className="text-right">{t('byRole.rate')}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {roleStats.map((r) => (
                      <TR key={r.roleId}>
                        <TD className="font-medium">{roleName(catalog, r.roleId)}</TD>
                        <TD className="text-right tabular-nums">{r.games}</TD>
                        <TD className="text-right tabular-nums">{r.wins}</TD>
                        <TD className="text-right tabular-nums">{formatPercent(r.winRate)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function ScoreRow({ label, detail, points }: { label: string; detail: string; points: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/50 py-1.5">
      <span>
        {label} <span className="text-xs text-muted-foreground">{detail}</span>
      </span>
      <span className="shrink-0 tabular-nums">{points > 0 ? `+${points}` : '0'}</span>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  )
}
