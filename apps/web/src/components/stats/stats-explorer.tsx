'use client'

import {
  computeGlobalStats,
  computeHeadToHead,
  computeLeaderboard,
  computeMonthly,
  computePlayerRoleStats,
  computePlayerStats,
  computeRoleStats,
  computeSynergy,
  deathCauseLabel,
  filterRecords,
  presentWinnerGroups,
  roleName,
  winConditionText,
  winnerGroupLabel,
  WINNER_GROUPS,
  type CatalogTexts,
  type GameResultRecord,
  type LeaderboardEntry,
  type Player,
  type PlayerStat,
  type StatsFilter,
  type WinnerGroup,
} from '@werewolf/shared'
import { useFormatter, useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import { RoleIcon } from '@/components/pixel/icons'
import { Distribution, type Slice } from '@/components/stats/distribution'
import { FilterBar } from '@/components/stats/filter-bar'
import { InfoDot } from '@/components/stats/info-dot'
import { MonthlyChart } from '@/components/stats/monthly-chart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { useCatalog } from '@/lib/texts'
import { cn, formatDecimal, formatPercent } from '@/lib/utils'

const WINNER_COLOR: Record<WinnerGroup, string> = {
  village: 'bg-sky-400',
  werewolves: 'bg-red-400',
  lovers: 'bg-pink-400',
  solo: 'bg-amber-400',
  none: 'bg-slate-500',
}

/**
 * Death causes in the colour of whoever causes them — red is the wolves, blue is
 * the village, just like in the winner distribution. That way a colour means the same
 * thing across the whole page, instead of "werewolves" in one place and "lynch" in another.
 */
const DEATH_COLOR: Record<string, string> = {
  werewolf: 'bg-red-400',
  lynch: 'bg-sky-400',
  'witch-poison': 'bg-violet-400',
  hunter: 'bg-emerald-400',
  heartbreak: 'bg-pink-400',
  'rusty-sword': 'bg-orange-400',
  other: 'bg-slate-500',
}

/** Minimum sample size for rate-based statements. Below this count a
 *  rate is noise, not a signal — such rows are left out. */
const MIN_SAMPLE = 5
/** Minimum games for a role to appear in the roles table. */
const MIN_ROLE_GAMES = 3

const TABS = ['overview', 'players', 'roles', 'compare'] as const
type TabId = (typeof TABS)[number]

type Translator = ReturnType<typeof useTranslations<'stats'>>

/** Deviation in percentage points, with sign. */
function formatDelta(delta: number | null): string {
  if (delta === null) return '—'
  const pp = Math.round(delta * 100)
  return `${pp >= 0 ? '+' : '−'}${Math.abs(pp)} pp`
}

export function StatsExplorer({ records, players }: { records: GameResultRecord[]; players: Player[] }) {
  const t = useTranslations('stats')
  const [filter, setFilter] = useState<StatsFilter>({})
  const [tab, setTab] = useState<TabId>('overview')

  const filtered = useMemo(() => filterRecords(records, filter), [records, filter])
  const nameById = useMemo(() => new Map(players.map((p) => [p.id, p.displayName])), [players])
  const nameOf = (id: string) => nameById.get(id) ?? t('unknownPlayer')

  return (
    <div className="flex flex-col gap-4">
      <FilterBar filter={filter} onChange={setFilter} players={players} />

      <div className="flex gap-1 overflow-x-auto">
        {TABS.map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              tab === id ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(`tabs.${id}`)}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {t('filterSummary', { filtered: filtered.length, total: records.length })}
      </p>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t('noGamesInFilter')}</p>
      ) : tab === 'overview' ? (
        <Overview records={filtered} nameOf={nameOf} />
      ) : tab === 'players' ? (
        <PlayersTab records={filtered} nameOf={nameOf} />
      ) : tab === 'roles' ? (
        <RolesTab records={filtered} nameOf={nameOf} />
      ) : (
        <CompareTab records={filtered} players={players} nameOf={nameOf} />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// Overview — "how is the village doing?"
// ══════════════════════════════════════════════════════════════════════════

function Overview({ records, nameOf }: { records: GameResultRecord[]; nameOf: (id: string) => string }) {
  const t = useTranslations('stats')
  const catalog = useCatalog()
  const format = useFormatter()
  const g = computeGlobalStats(records)
  const monthly = computeMonthly(records)
  const groups = presentWinnerGroups(monthly)

  const winnerSlices: Slice[] = WINNER_GROUPS.map((group) => ({
    key: group,
    label: winnerGroupLabel(catalog, group),
    count: g.winnerDistribution[group],
    color: WINNER_COLOR[group],
  }))

  const deaths = Object.entries(g.deathCauseDistribution).sort((a, b) => b[1] - a[1])
  const deathTotal = deaths.reduce((sum, [, n]) => sum + n, 0)
  const deathSlices: Slice[] = deaths.map(([cause, count]) => ({
    key: cause,
    label: deathCauseLabel(catalog, cause),
    count,
    color: DEATH_COLOR[cause] ?? 'bg-slate-500',
  }))

  const conditions = Object.entries(g.winConditionDistribution).sort((a, b) => b[1] - a[1])
  const moderators = Object.entries(g.moderatorDistribution).sort((a, b) => b[1] - a[1])
  const winnerLabels = Object.fromEntries(
    WINNER_GROUPS.map((group) => [group, winnerGroupLabel(catalog, group)]),
  ) as Record<WinnerGroup, string>

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="grid grid-cols-2 gap-3 pt-5 sm:grid-cols-4">
          <Metric
            label={t('overview.games')}
            value={String(g.totalGames)}
            sub={t('overview.liveQuick', { live: g.liveGames, quick: g.quickGames })}
          />
          <Metric label={t('overview.avgPlayers')} value={formatDecimal(format, g.avgPlayersPerGame)} />
          <Metric
            label={t('overview.avgRounds')}
            value={g.avgRounds === null ? '—' : formatDecimal(format, g.avgRounds)}
            sub={g.roundsSamples > 0 ? t('fromLiveGames', { count: g.roundsSamples }) : t('noLiveData')}
          />
          <Metric
            label={t('overview.survivalRate')}
            value={g.survivalRate === null ? '—' : formatPercent(g.survivalRate)}
            sub={
              g.survivalSamples > 0
                ? t('overview.fromLiveRoles', { count: g.survivalSamples })
                : t('noLiveData')
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {t('overview.whoWinsTitle')}
            <InfoDot text={t('overview.whoWinsInfo')} />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Distribution slices={winnerSlices} total={g.totalGames} />

          <details className="group text-sm">
            <summary className="cursor-pointer list-none text-xs text-muted-foreground hover:text-foreground">
              <span className="group-open:hidden">{t('overview.showConditions', { count: conditions.length })}</span>
              <span className="hidden group-open:inline">{t('overview.hideConditions')}</span>
            </summary>
            <ul className="mt-2 flex flex-col gap-1">
              {conditions.map(([wc, count]) => (
                <li key={wc} className="flex items-baseline justify-between gap-2 border-b border-border/40 py-1">
                  <span className="text-muted-foreground">{winConditionText(catalog, wc).label}</span>
                  <span className="tabular-nums">
                    {count}× <span className="text-xs text-muted-foreground">{formatPercent(count / g.totalGames)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {t('overview.deathsTitle')}
            <InfoDot text={t('overview.deathsInfo')} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Distribution
            slices={deathSlices}
            total={deathTotal}
            emptyLabel={t('overview.deathsEmpty')}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {t('overview.monthlyTitle')}
            <InfoDot text={t('overview.monthlyInfo')} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyChart points={monthly} groups={groups} colors={WINNER_COLOR} labels={winnerLabels} />
        </CardContent>
      </Card>

      {g.liveGames > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {t('overview.revealTitle')}
              <InfoDot text={t('overview.revealInfo')} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Distribution
              slices={[
                { key: 'on', label: t('overview.revealOn'), count: g.revealRolesDistribution.on, color: 'bg-amber-400' },
                { key: 'off', label: t('overview.revealOff'), color: 'bg-slate-500', count: g.revealRolesDistribution.off },
                { key: 'unknown', label: t('overview.revealUnknown'), count: g.revealRolesDistribution.unknown, color: 'bg-muted-foreground/40' },
              ]}
              total={g.liveGames}
            />
          </CardContent>
        </Card>
      )}

      {moderators.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('overview.moderatorsTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1 text-sm">
              {moderators.map(([id, count]) => (
                <li key={id} className="flex items-baseline justify-between border-b border-border/40 py-1">
                  <span>{nameOf(id)}</span>
                  <span className="tabular-nums">{count}×</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// Players — "what kind of player is this?" (the leaderboard answers "who leads?")
// ══════════════════════════════════════════════════════════════════════════

interface Highlight {
  label: string
  playerId: string
  value: string
  hint: string
}

/**
 * Superlatives over the filtered games. Rate-based rows only appear from
 * `MIN_SAMPLE` observations — otherwise anyone who played once and won once
 * would always win them.
 */
function buildHighlights(
  stats: PlayerStat[],
  board: LeaderboardEntry[],
  t: Translator,
  catalog: CatalogTexts,
): Highlight[] {
  const out: Highlight[] = []
  const best = <T,>(items: T[], value: (t: T) => number | null): T | null => {
    let top: T | null = null
    let topV = -Infinity
    for (const it of items) {
      const v = value(it)
      if (v === null || v <= topV) continue
      top = it
      topV = v
    }
    return top
  }
  const push = (label: string, s: PlayerStat | null, value: (s: PlayerStat) => string, hint: (s: PlayerStat) => string) => {
    if (s) out.push({ label, playerId: s.playerId, value: value(s), hint: hint(s) })
  }

  const played = stats.filter((s) => s.games > 0)

  push(
    t('players.mostGames'),
    best(played, (s) => s.games),
    (s) => `${s.games}`,
    (s) => t('players.mostGamesHint', { rate: formatPercent(s.winRate) }),
  )

  push(
    t('players.bestWinRate'),
    best(played.filter((s) => s.games >= MIN_SAMPLE), (s) => s.winRate),
    (s) => formatPercent(s.winRate),
    (s) => t('players.winsOfGames', { wins: s.wins, games: s.games }),
  )

  push(
    t('players.strongestVillage'),
    best(played.filter((s) => s.byFaction.village.games >= MIN_SAMPLE), (s) => s.byFaction.village.winRate),
    (s) => formatPercent(s.byFaction.village.winRate),
    (s) =>
      t('players.strongestVillageHint', { wins: s.byFaction.village.wins, games: s.byFaction.village.games }),
  )

  push(
    t('players.strongestPack'),
    best(played.filter((s) => s.byFaction.werewolves.games >= MIN_SAMPLE), (s) => s.byFaction.werewolves.winRate),
    (s) => formatPercent(s.byFaction.werewolves.winRate),
    (s) =>
      t('players.strongestPackHint', {
        wins: s.byFaction.werewolves.wins,
        games: s.byFaction.werewolves.games,
      }),
  )

  push(
    t('players.survivesMost'),
    best(played.filter((s) => s.survivalSamples >= MIN_SAMPLE), (s) => s.survivalRate),
    (s) => formatPercent(s.survivalRate ?? 0),
    (s) => t('fromLiveGames', { count: s.survivalSamples }),
  )

  push(
    t('players.mostLynched'),
    best(played, (s) => s.deathCauses.lynch ?? null),
    (s) => `${s.deathCauses.lynch}×`,
    () => t('players.mostLynchedHint'),
  )

  push(
    t('players.mostRoles'),
    best(played, (s) => s.distinctRoles),
    (s) => `${s.distinctRoles}`,
    (s) => t('players.mostRolesHint', { role: s.topRole ? roleName(catalog, s.topRole.roleId) : '—' }),
  )

  push(
    t('players.moderatesMost'),
    best(stats, (s) => (s.moderated > 0 ? s.moderated : null)),
    (s) => `${s.moderated}×`,
    () => t('players.moderatesMostHint'),
  )

  const streak = board.filter((e) => e.longestWinStreak >= 2).sort((a, b) => b.longestWinStreak - a.longestWinStreak)[0]
  if (streak) {
    out.push({
      label: t('players.longestStreak'),
      playerId: streak.playerId,
      value: `${streak.longestWinStreak}×`,
      hint: t('players.longestStreakHint'),
    })
  }

  return out
}

function PlayersTab({ records, nameOf }: { records: GameResultRecord[]; nameOf: (id: string) => string }) {
  const t = useTranslations('stats')
  const catalog = useCatalog()
  const stats = computePlayerStats(records)
  const board = computeLeaderboard(records, { minGames: 1 })
  const played = stats.filter((s) => s.games > 0)
  const highlights = buildHighlights(stats, board, t, catalog)

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {t('players.highlightsTitle')}
            <InfoDot text={t('players.highlightsInfo', { minSample: MIN_SAMPLE })} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {highlights.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('players.highlightsEmpty')}</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {highlights.map((h) => (
                <li key={h.label} className="flex items-baseline gap-2 border-b border-border/40 py-1.5 last:border-0">
                  <span className="w-40 shrink-0 text-xs text-muted-foreground">{h.label}</span>
                  <span className="flex-1 truncate font-medium">{nameOf(h.playerId)}</span>
                  <span className="shrink-0 text-right">
                    <span className="font-semibold tabular-nums">{h.value}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{h.hint}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {t('players.allTitle')}
            <InfoDot text={t('players.allInfo')} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>{t('players.player')}</TH>
                <TH className="text-right">{t('players.games')}</TH>
                <TH className="text-right">{t('players.rate')}</TH>
                <TH className="text-right">
                  <span className="inline-flex items-center gap-1">
                    {t('players.survived')} <InfoDot text={t('players.survivedInfo')} />
                  </span>
                </TH>
              </TR>
            </THead>
            <TBody>
              {played.map((s) => (
                <TR key={s.playerId}>
                  <TD>
                    <span className="font-medium">{nameOf(s.playerId)}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <FactionRate label={t('factionLetter.village')} split={s.byFaction.village} className="text-sky-300" />
                      <FactionRate label={t('factionLetter.werewolves')} split={s.byFaction.werewolves} className="text-red-300" />
                      {s.byFaction.solo.games > 0 && (
                        <FactionRate label={t('factionLetter.solo')} split={s.byFaction.solo} className="text-amber-300" />
                      )}
                      {s.topRole && (
                        <span
                          className="flex items-center gap-1"
                          title={t('players.distinctRoles', { count: s.distinctRoles })}
                        >
                          <RoleIcon roleId={s.topRole.roleId} size={12} />
                          {roleName(catalog, s.topRole.roleId)} {s.topRole.games}×
                        </span>
                      )}
                    </span>
                  </TD>
                  <TD className="text-right tabular-nums">{s.games}</TD>
                  <TD className="text-right font-semibold tabular-nums">{formatPercent(s.winRate)}</TD>
                  <TD className="text-right tabular-nums">
                    {s.survivalRate === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <>
                        {formatPercent(s.survivalRate)}
                        <span className="ml-1 text-xs text-muted-foreground">({s.survivalSamples})</span>
                      </>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">{t('players.note')}</p>
        </CardContent>
      </Card>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// Roles — "which role really helps its side?"
// ══════════════════════════════════════════════════════════════════════════

function RolesTab({ records, nameOf }: { records: GameResultRecord[]; nameOf: (id: string) => string }) {
  const t = useTranslations('stats')
  const catalog = useCatalog()
  const format = useFormatter()
  const [showAll, setShowAll] = useState(false)
  const all = computeRoleStats(records)
  const shown = showAll ? all : all.filter((r) => r.games >= MIN_ROLE_GAMES)
  const hidden = all.length - shown.length

  // Heatmap only over the most-played roles — with 120+ catalogue roles a full matrix
  // would be wider than any screen and therefore unreadable.
  const HEAT_ROLES = 12
  const prs = computePlayerRoleStats(records)
  const heatRoleIds = all.slice(0, HEAT_ROLES).map((r) => r.roleId)
  const heatPlayerIds = [...new Set(prs.map((s) => s.playerId))]
  const cell = new Map(prs.map((s) => [`${s.playerId}:${s.roleId}`, s]))
  const baselines = all.find((r) => r.factionBaseline !== null)

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {t('roles.title')}
            <InfoDot text={t('roles.info')} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>{t('roles.role')}</TH>
                <TH className="text-right">{t('roles.games')}</TH>
                <TH className="text-right">{t('roles.rate')}</TH>
                <TH className="text-right">Δ</TH>
                <TH className="text-right">{t('roles.survived')}</TH>
                <TH className="text-right">{t('roles.avgDeath')}</TH>
              </TR>
            </THead>
            <TBody>
              {shown.map((r) => (
                <TR key={r.roleId}>
                  <TD>
                    <span className="flex items-center gap-1.5">
                      <RoleIcon roleId={r.roleId} size={14} />
                      <span className="truncate">{roleName(catalog, r.roleId)}</span>
                    </span>
                  </TD>
                  <TD className="text-right tabular-nums">{r.games}</TD>
                  <TD className="text-right tabular-nums">{formatPercent(r.winRate)}</TD>
                  <TD
                    className={cn(
                      'text-right font-semibold tabular-nums',
                      r.winRateDelta !== null && r.winRateDelta > 0.02 && 'text-emerald-400',
                      r.winRateDelta !== null && r.winRateDelta < -0.02 && 'text-red-400',
                    )}
                  >
                    {formatDelta(r.winRateDelta)}
                  </TD>
                  <TD className="text-right tabular-nums">
                    {r.survivalRate === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <>
                        {formatPercent(r.survivalRate)}
                        <span className="ml-1 text-xs text-muted-foreground">({r.survivalSamples})</span>
                      </>
                    )}
                  </TD>
                  <TD className="text-right tabular-nums text-muted-foreground">
                    {r.avgDiedRound === null ? '—' : t('roles.round', { value: formatDecimal(format, r.avgDiedRound) })}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {baselines ? t('roles.noteWithDelta') : t('roles.note')}
            </p>
            {hidden > 0 && !showAll && (
              <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>
                {t('roles.showHidden', { hidden, min: MIN_ROLE_GAMES })}
              </Button>
            )}
            {showAll && (
              <Button variant="ghost" size="sm" onClick={() => setShowAll(false)}>
                {t('roles.showFrequent', { min: MIN_ROLE_GAMES })}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {t('roles.heatmapTitle')}
            <InfoDot text={t('roles.heatmapInfo')} />
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {heatRoleIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noData')}</p>
          ) : (
            <>
              <table className="border-separate border-spacing-0.5 text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-card" />
                    {heatRoleIds.map((rid) => (
                      <th key={rid} className="px-1 pb-1" title={roleName(catalog, rid)}>
                        <RoleIcon roleId={rid} size={14} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatPlayerIds.map((pid) => (
                    <tr key={pid}>
                      <td className="sticky left-0 z-10 max-w-24 truncate bg-card pr-2 font-medium">{nameOf(pid)}</td>
                      {heatRoleIds.map((rid) => {
                        const s = cell.get(`${pid}:${rid}`)
                        if (!s) return <td key={rid} className="h-7 w-7 text-center text-muted-foreground/40">·</td>
                        return (
                          <td
                            key={rid}
                            title={t('roles.heatmapCell', {
                              player: nameOf(pid),
                              role: roleName(catalog, rid),
                              rate: formatPercent(s.winRate),
                              games: s.games,
                            })}
                            className="h-7 w-7 rounded text-center font-medium text-white"
                            style={{ backgroundColor: `hsl(${s.winRate * 120} 55% 32%)` }}
                          >
                            {s.games}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-muted-foreground">
                {t('roles.heatmapNote', { count: heatRoleIds.length })}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// Comparison
// ══════════════════════════════════════════════════════════════════════════

function CompareTab({
  records,
  players,
  nameOf,
}: {
  records: GameResultRecord[]
  players: Player[]
  nameOf: (id: string) => string
}) {
  const t = useTranslations('stats')
  const [aId, setAId] = useState('')
  const [bId, setBId] = useState('')
  const [synId, setSynId] = useState('')

  const h2h = aId && bId && aId !== bId ? computeHeadToHead(records, aId, bId) : null
  const syn = synId ? computeSynergy(records, synId) : null

  const playerOption = (p: Player) => (
    <option key={p.id} value={p.id}>
      {p.displayName}
    </option>
  )

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {t('compare.headToHeadTitle')}
            <InfoDot text={t('compare.headToHeadInfo')} />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <Select value={aId} onChange={(e) => setAId(e.target.value)}>
              <option value="">{t('compare.playerA')}</option>
              {players.map(playerOption)}
            </Select>
            <Select value={bId} onChange={(e) => setBId(e.target.value)}>
              <option value="">{t('compare.playerB')}</option>
              {players.map(playerOption)}
            </Select>
          </div>
          {h2h && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <CompareSide name={nameOf(aId)} games={h2h.a.games} winRate={h2h.a.winRate} />
                <CompareSide name={nameOf(bId)} games={h2h.b.games} winRate={h2h.b.winRate} />
              </div>
              <div className="rounded-md bg-muted/40 p-3 text-sm">
                <p>
                  {t.rich('compare.sharedGames', {
                    count: h2h.bothGames,
                    strong: (chunks) => <strong>{chunks}</strong>,
                  })}
                </p>
                <p className="text-muted-foreground">
                  {t('compare.sameTeam', { games: h2h.sameTeam.games, coWins: h2h.sameTeam.coWins })}
                </p>
                <p className="text-muted-foreground">
                  {t('compare.opposite', {
                    games: h2h.opposite.games,
                    a: nameOf(aId),
                    aWins: h2h.opposite.aWins,
                    bWins: h2h.opposite.bWins,
                    b: nameOf(bId),
                  })}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {t('compare.alliesTitle')}
            <InfoDot text={t('compare.alliesInfo')} />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Select value={synId} onChange={(e) => setSynId(e.target.value)}>
            <option value="">{t('compare.choosePlayer')}</option>
            {players.map(playerOption)}
          </Select>
          {syn && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <h3 className="mb-1 text-sm font-semibold text-emerald-400">{t('compare.bestAllies')}</h3>
                <SynergyList
                  rows={syn.allies.slice(0, 5).map((a) => ({
                    id: a.playerId,
                    main: t('compare.winsCount', { count: a.wins }),
                    sub: t('compare.rateOfGames', { rate: formatPercent(a.winRate), games: a.games }),
                  }))}
                  nameOf={nameOf}
                  empty={t('compare.none')}
                />
              </div>
              <div>
                <h3 className="mb-1 text-sm font-semibold text-red-400">{t('compare.nemeses')}</h3>
                <SynergyList
                  rows={syn.nemeses.slice(0, 5).map((n) => ({
                    id: n.playerId,
                    main: t('compare.lossesCount', { count: n.losses }),
                    sub: t('compare.rateOfGames', { rate: formatPercent(n.lossRate), games: n.games }),
                  }))}
                  nameOf={nameOf}
                  empty={t('compare.none')}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function CompareSide({ name, games, winRate }: { name: string; games: number; winRate: number }) {
  const t = useTranslations('stats')
  return (
    <div className="flex flex-col items-center gap-1 rounded-md bg-muted/40 p-3 text-center">
      <span className="truncate text-sm font-medium">{name}</span>
      <span className="text-lg font-bold">{formatPercent(winRate)}</span>
      <span className="text-xs text-muted-foreground">{t('gameCount', { count: games })}</span>
    </div>
  )
}

function SynergyList({
  rows,
  nameOf,
  empty,
}: {
  rows: { id: string; main: string; sub: string }[]
  nameOf: (id: string) => string
  empty: string
}) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>
  return (
    <div className="flex flex-col gap-1">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/30 px-2 py-1 text-sm">
          <span className="truncate">{nameOf(r.id)}</span>
          <span className="shrink-0 tabular-nums">
            {r.main} <span className="text-xs text-muted-foreground">({r.sub})</span>
          </span>
        </div>
      ))}
    </div>
  )
}

/** A faction's rate including the sample size — "D 60%·30". */
function FactionRate({
  label,
  split,
  className,
}: {
  label: string
  split: { games: number; winRate: number }
  className?: string
}) {
  const t = useTranslations('stats')
  if (split.games === 0) return <span className="text-muted-foreground">{label} —</span>
  return (
    <span className={className} title={t('gameCount', { count: split.games })}>
      {label} {formatPercent(split.winRate)}
      <span className="text-muted-foreground">·{split.games}</span>
    </span>
  )
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md bg-muted/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
      {sub && <div className="text-[10px] leading-tight text-muted-foreground">{sub}</div>}
    </div>
  )
}
