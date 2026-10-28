import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { winConditionText, type LeaderboardEntry, type Player } from '@werewolf/shared'
import { getFormatter, getTranslations } from 'next-intl/server'
import { HomeHero } from '@/components/home-hero'
import { Icon, RoleIcon } from '@/components/pixel/icons'
import { Button } from '@/components/ui/button'
import { instanceTimeZone } from '@/i18n/config'
import { hourIn, isNightHour } from '@/lib/day-night'
import { serverFetch } from '@/lib/server-api'
import { getCatalog } from '@/lib/texts.server'
import type { GameListItem } from '@/lib/types'
import { cn, formatDate, formatDecimal } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const TILES = [
  {
    href: '/leaderboard',
    icon: 'crown',
    key: 'leaderboard',
    glow: 'from-amber-400/25',
  },
  {
    href: '/games',
    icon: 'moon',
    key: 'games',
    glow: 'from-indigo-400/25',
  },
  {
    href: '/players',
    icon: 'friends',
    key: 'players',
    glow: 'from-emerald-400/20',
  },
  {
    href: '/stats',
    icon: 'magnifier',
    key: 'stats',
    glow: 'from-fuchsia-400/25',
  },
] as const

const RANK_RING = ['ring-amber-400', 'ring-slate-300', 'ring-amber-700']

export default async function HomePage() {
  const [t, tn, format, catalog] = await Promise.all([
    getTranslations('home'),
    getTranslations('nav'),
    getFormatter(),
    getCatalog(),
  ])
  const [games, players, board] = await Promise.all([
    serverFetch<GameListItem[]>('/games'),
    serverFetch<Player[]>('/players?includeArchived=true'),
    serverFetch<{ minGames: number; entries: LeaderboardEntry[] }>('/stats/leaderboard'),
  ])

  const nameById = new Map(players.map((p) => [p.id, p.displayName]))
  const finished = games.filter((g) => g.status === 'FINISHED')
  const running = games.filter((g) => g.mode === 'LIVE' && (g.status === 'LIVE' || g.status === 'SETUP'))
  const recent = finished.slice(0, 3)
  const top = board.entries.filter((e) => e.qualified).slice(0, 3)
  // A tie shares the rank (1, 1, 3, …)
  const leaders = board.entries.filter((e) => e.rank === 1)
  const activePlayers = players.filter((p) => p.active).length

  const villageWins = finished.filter((g) => g.winningCondition === 'village').length
  const wolfWins = finished.filter((g) => g.winningCondition === 'werewolves').length
  const otherWins = finished.length - villageWins - wolfWins
  const share = (n: number) => (finished.length ? (n / finished.length) * 100 : 0)

  const counts: Record<string, string> = {
    '/leaderboard':
      leaders.length === 1
        ? t('tileCounts.leader', { name: nameById.get(leaders[0]!.playerId) ?? t('unknownPlayer') })
        : leaders.length > 1
          ? t('tileCounts.tied', { count: leaders.length })
          : '',
    '/games': t('tileCounts.games', { count: finished.length }),
    '/players': t('tileCounts.active', { count: activePlayers }),
    '/stats': finished.length ? t('tileCounts.ranked', { count: board.entries.length }) : '',
  }

  return (
    <div className="flex flex-col gap-8">
      <HomeHero initialNight={isNightHour(hourIn(instanceTimeZone()))} />

      {/* ── Running live games ──────────────────────────────────────────── */}
      {running.map((g) => (
        <Link
          key={g.id}
          href={`/games/live/${g.id}`}
          className="group -mt-2 flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 transition-colors hover:bg-primary/20"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
          <span className="flex-1 text-sm">
            <span className="font-semibold">{t('live.running')}</span>
            <span className="text-muted-foreground">
              {' '}
              · {t('live.meta', { date: formatDate(format, g.playedAt), count: g.players.length })}
            </span>
          </span>
          <span className="flex items-center gap-1 text-sm font-medium text-primary">
            {t('live.continue')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      ))}

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3">
        {TILES.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="group relative flex flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50 sm:p-5"
          >
            <div
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br to-transparent opacity-60 blur-2xl transition-opacity group-hover:opacity-100',
                tile.glow,
              )}
            />
            <div className="relative flex items-start justify-between">
              <Icon name={tile.icon} size={32} className="transition-transform group-hover:scale-110" />
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
            </div>
            <div className="relative">
              <h2 className="font-semibold">{tn(tile.key)}</h2>
              <p className="mt-0.5 hidden text-sm text-muted-foreground sm:block">{t(`tiles.${tile.key}`)}</p>
              {counts[tile.href] && (
                <p className="mt-1 truncate text-xs font-medium text-primary/90">{counts[tile.href]}</p>
              )}
            </div>
          </Link>
        ))}
      </section>

      {finished.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center">
          <Icon name="sparkle" size={32} />
          <p className="font-semibold">{t('empty.title')}</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {t('empty.text')}
          </p>
          <div className="flex gap-2">
            <Link href="/players">
              <Button variant="secondary" size="sm">
                {t('empty.addPlayers')}
              </Button>
            </Link>
            <Link href="/games/new">
              <Button size="sm">{t('empty.recordGame')}</Button>
            </Link>
          </div>
        </section>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2">
          {/* ── Top of the leaderboard ── */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <Icon name="crown" size={18} /> {t('top.title')}
              </h2>
              <Link href="/leaderboard" className="text-xs text-muted-foreground hover:text-foreground">
                {t('viewAll')}
              </Link>
            </div>
            {top.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('top.empty', { minGames: board.minGames })}
              </p>
            ) : (
              <ol className="flex flex-col gap-2">
                {top.map((e, i) => {
                  const rank = e.rank ?? i + 1
                  return (
                    <li key={e.playerId}>
                      <Link
                        href={`/stats/players/${e.playerId}`}
                        className="flex items-center gap-3 rounded-md px-1 py-1 transition-colors hover:bg-muted/50"
                      >
                        <span
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/50 text-xs font-bold tabular-nums ring-2',
                            RANK_RING[rank - 1],
                          )}
                        >
                          {rank}
                        </span>
                        <span className="flex-1 truncate text-sm font-medium">
                          {nameById.get(e.playerId) ?? t('unknownPlayer')}
                        </span>
                        <span className="text-sm font-semibold tabular-nums">
                          <span className="text-xs font-normal text-muted-foreground">{t('top.average')} </span>
                          {formatDecimal(format, e.pointsPerGame)}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>

          {/* ── Balance of power ── */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Icon name="shield" size={18} /> {t('balance.title')}
            </h2>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold tabular-nums text-sky-300">{villageWins}</p>
                <p className="text-xs text-muted-foreground">{t('balance.village')}</p>
              </div>
              {otherWins > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold tabular-nums text-fuchsia-300">{otherWins}</p>
                  <p className="text-xs text-muted-foreground">{t('balance.others')}</p>
                </div>
              )}
              <div className="text-right">
                <p className="text-2xl font-bold tabular-nums text-rose-400">{wolfWins}</p>
                <p className="text-xs text-muted-foreground">{t('balance.werewolves')}</p>
              </div>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
              <div className="bg-sky-400" style={{ width: `${share(villageWins)}%` }} />
              <div className="bg-fuchsia-400" style={{ width: `${share(otherWins)}%` }} />
              <div className="bg-rose-500" style={{ width: `${share(wolfWins)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{t('balance.summary', { count: finished.length })}</p>
          </div>

          {/* ── Latest games ── */}
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-5 sm:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <Icon name="scroll" size={18} /> {t('recent.title')}
              </h2>
              <Link href="/games" className="text-xs text-muted-foreground hover:text-foreground">
                {t('viewAll')}
              </Link>
            </div>
            <ul className="flex flex-col divide-y divide-border">
              {recent.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/games/${g.id}`}
                    className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/40"
                  >
                    <Icon name={g.mode === 'LIVE' ? 'moon' : 'sun'} size={18} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {formatDate(format, g.playedAt)}
                        <span className="font-normal text-muted-foreground">
                          {' '}
                          ·{' '}
                          {t('recent.win', {
                            condition: g.winningCondition
                              ? winConditionText(catalog, g.winningCondition).label
                              : '—',
                          })}
                        </span>
                      </p>
                      <div className="mt-1 flex gap-0.5 overflow-hidden">
                        {g.players
                          .filter((p) => p.roleId)
                          .slice(0, 12)
                          .map((p) => (
                            <RoleIcon key={p.id} roleId={p.roleId!} size={14} />
                          ))}
                      </div>
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {g.players.length}{' '}
                      <span className="hidden sm:inline">{t('recent.playerUnit', { count: g.players.length })}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  )
}
