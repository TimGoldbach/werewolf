import Link from 'next/link'
import type { LeaderboardEntry, Player } from '@werewolf/shared'
import { getFormatter, getTranslations } from 'next-intl/server'
import { Icon } from '@/components/pixel/icons'
import { ScoringInfo } from '@/components/stats/scoring-info'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { serverFetch } from '@/lib/server-api'
import { cn, formatDecimal, formatPercent } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function streakLabel(streak: number): string {
  if (streak > 1) return `🔥 ${streak}`
  if (streak < -1) return `❄️ ${Math.abs(streak)}`
  return '–'
}

/** Wins shared with at most one other person — the most valuable points. */
function specialWins(e: LeaderboardEntry): number {
  return e.winsByCategory.lovers + e.winsByCategory.solo
}

const MEDAL = ['ring-amber-400', 'ring-slate-300', 'ring-amber-700']

export default async function LeaderboardPage() {
  const t = await getTranslations('leaderboard')
  const format = await getFormatter()
  const [board, players] = await Promise.all([
    serverFetch<{ minGames: number; entries: LeaderboardEntry[] }>('/stats/leaderboard'),
    serverFetch<Player[]>('/players?includeArchived=true'),
  ])
  const nameById = new Map(players.map((p) => [p.id, p.displayName]))
  const nameOf = (id: string) => nameById.get(id) ?? t('unknownPlayer')
  const { entries, minGames } = board
  const qualified = entries.filter((e) => e.qualified)
  const top = qualified.slice(0, 3).map((e, i) => ({ e, rank: e.rank ?? i + 1 }))
  const podium = [top[1], top[0], top[2]].filter(Boolean) as { e: LeaderboardEntry; rank: number }[]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Link href="/games/new">
          <Button size="sm">{t('recordGame')}</Button>
        </Link>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardHeader className="items-center text-center">
            <Icon name="moon" size={48} />
            <CardTitle>{t('empty.title')}</CardTitle>
            <CardDescription>{t('empty.description')}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-2">
            <Link href="/players">
              <Button variant="secondary">{t('empty.createPlayers')}</Button>
            </Link>
            <Link href="/games/new">
              <Button>{t('recordGame')}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {podium.length > 0 && (
            <div className="grid grid-cols-3 items-end gap-2">
              {podium.map(({ e, rank }) => (
                <Link
                  key={e.playerId}
                  href={`/stats/players/${e.playerId}`}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-3 text-center',
                    rank === 1 && 'border-amber-400/60 pb-5',
                  )}
                >
                  <div className="relative">
                    <span
                      className={cn(
                        'flex items-center justify-center rounded-full bg-muted/50 font-bold tabular-nums ring-2',
                        MEDAL[rank - 1],
                        rank === 1 ? 'h-12 w-12 text-xl' : 'h-9 w-9 text-base',
                      )}
                    >
                      {rank}
                    </span>
                    {rank === 1 && (
                      <span className="absolute -right-2 -top-3">
                        <Icon name="crown" size={18} />
                      </span>
                    )}
                  </div>
                  <span className="truncate text-sm font-semibold">{nameOf(e.playerId)}</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {t('podium.avgPoints', { value: formatDecimal(format, e.pointsPerGame) })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t('podium.gamesAndRate', { count: e.games, rate: formatPercent(e.winRate) })}
                  </span>
                </Link>
              ))}
            </div>
          )}

          <Card>
            <CardContent className="pt-5">
              <Table>
                <THead>
                  <TR>
                    <TH className="w-8">#</TH>
                    <TH>{t('table.player')}</TH>
                    <TH className="text-right">{t('table.games')}</TH>
                    <TH className="text-right">{t('table.rate')}</TH>
                    <TH className="text-right">{t('table.streak')}</TH>
                    <TH className="text-right">{t('table.avgPoints')}</TH>
                  </TR>
                </THead>
                <TBody>
                  {entries.map((e) => (
                    <TR key={e.playerId} className={e.qualified ? '' : 'opacity-50'}>
                      <TD className="text-muted-foreground">
                        {e.rank === null ? '–' : e.rank === 1 ? <Icon name="star" size={16} /> : e.rank}
                      </TD>
                      <TD>
                        <Link
                          href={`/stats/players/${e.playerId}`}
                          className="font-medium hover:underline"
                        >
                          {nameOf(e.playerId)}
                        </Link>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge variant="village">
                            {t('factionLetter.village')} {formatPercent(e.byFaction.village.winRate)}
                          </Badge>
                          <Badge variant="werewolves">
                            {t('factionLetter.werewolves')} {formatPercent(e.byFaction.werewolves.winRate)}
                          </Badge>
                          {e.byFaction.solo.games > 0 && (
                            <Badge variant="solo">
                              {t('factionLetter.solo')} {formatPercent(e.byFaction.solo.winRate)}
                            </Badge>
                          )}
                          {specialWins(e) > 0 && (
                            <Badge variant="default" title={t('table.specialWinsTitle')}>
                              ★ {specialWins(e)}
                            </Badge>
                          )}
                        </div>
                      </TD>
                      <TD className="text-right tabular-nums">{e.games}</TD>
                      <TD className="text-right tabular-nums">{formatPercent(e.winRate)}</TD>
                      <TD className="text-right tabular-nums">{streakLabel(e.currentStreak)}</TD>
                      <TD className="text-right font-semibold tabular-nums">
                        {formatDecimal(format, e.pointsPerGame)}
                        <div className="text-xs font-normal text-muted-foreground">
                          {t('table.points', { points: e.points })}
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              <p className="mt-3 text-xs text-muted-foreground">{t('footnote', { minGames })}</p>
            </CardContent>
          </Card>

          <ScoringInfo minGames={minGames} />
        </>
      )}
    </div>
  )
}
