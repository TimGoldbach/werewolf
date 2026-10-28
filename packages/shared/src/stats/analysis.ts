import { resolvePlayerFaction, winnerGroupOf } from './compute.js'
import { WINNER_GROUPS, type WinnerGroup } from './scoring.js'
import type {
  GameResultRecord,
  HeadToHead,
  H2HSummary,
  MonthlyPoint,
  StatsFilter,
  Synergy,
} from './types.js'

/**
 * Filters game records. OR-combined within a dimension, AND-combined across
 * dimensions. A game matches a player/role/faction filter if AT LEAST one
 * participating player meets the condition.
 */
export function filterRecords(records: GameResultRecord[], f: StatsFilter): GameResultRecord[] {
  const players = f.playerIds && f.playerIds.length ? new Set(f.playerIds) : null
  const roles = f.roleIds && f.roleIds.length ? new Set(f.roleIds) : null
  const factions = f.factions && f.factions.length ? new Set(f.factions) : null
  // Bounds are day-inclusive & symmetric: expand plain dates (YYYY-MM-DD) to the
  // start or end of the day, otherwise the end day would wrongly be left out.
  const from = f.from ? (f.from.length <= 10 ? `${f.from}T00:00:00.000Z` : f.from) : null
  const to = f.to ? (f.to.length <= 10 ? `${f.to}T23:59:59.999Z` : f.to) : null

  return records.filter((g) => {
    if (from && g.playedAt < from) return false
    if (to && g.playedAt > to) return false
    if (players && !g.players.some((p) => players.has(p.playerId))) return false
    if (roles && !g.players.some((p) => roles.has(p.roleId))) return false
    if (factions) {
      const hit = g.players.some((p) => {
        const fac = resolvePlayerFaction(p)
        return fac !== null && factions.has(fac)
      })
      if (!hit) return false
    }
    return true
  })
}

function summary(records: GameResultRecord[], playerId: string): H2HSummary {
  let games = 0
  let wins = 0
  for (const g of records) {
    const me = g.players.find((p) => p.playerId === playerId)
    if (!me) continue
    games++
    if (me.isWinner) wins++
  }
  return { playerId, games, wins, winRate: games ? wins / games : 0 }
}

/** Head-to-head of two players: individual record, shared & opposing games. */
export function computeHeadToHead(
  records: GameResultRecord[],
  aId: string,
  bId: string,
): HeadToHead {
  let bothGames = 0
  let stGames = 0
  let stCoWins = 0
  let opGames = 0
  let aWins = 0
  let bWins = 0

  for (const g of records) {
    const pa = g.players.find((p) => p.playerId === aId)
    const pb = g.players.find((p) => p.playerId === bId)
    if (!pa || !pb) continue
    bothGames++
    const fa = resolvePlayerFaction(pa)
    const fb = resolvePlayerFaction(pb)
    if (fa && fb && fa === fb) {
      stGames++
      if (pa.isWinner) stCoWins++
    } else if (fa && fb && fa !== fb) {
      opGames++
      if (pa.isWinner) aWins++
      if (pb.isWinner) bWins++
    }
  }

  return {
    a: summary(records, aId),
    b: summary(records, bId),
    bothGames,
    sameTeam: { games: stGames, coWins: stCoWins },
    opposite: { games: opGames, aWins, bWins },
  }
}

/** Best allies (most shared wins) and nemeses (most losses against). */
export function computeSynergy(
  records: GameResultRecord[],
  playerId: string,
  options: { minGames?: number } = {},
): Synergy {
  const minGames = options.minGames ?? 2
  const allyAcc = new Map<string, { games: number; wins: number }>()
  const nemAcc = new Map<string, { games: number; losses: number }>()

  for (const g of records) {
    const me = g.players.find((p) => p.playerId === playerId)
    if (!me) continue
    const myFac = resolvePlayerFaction(me)
    if (!myFac) continue
    for (const p of g.players) {
      if (p.playerId === playerId) continue
      const fac = resolvePlayerFaction(p)
      if (!fac) continue
      if (fac === myFac) {
        const a = allyAcc.get(p.playerId) ?? { games: 0, wins: 0 }
        a.games++
        if (me.isWinner) a.wins++
        allyAcc.set(p.playerId, a)
      } else {
        const n = nemAcc.get(p.playerId) ?? { games: 0, losses: 0 }
        n.games++
        if (p.isWinner && !me.isWinner) n.losses++
        nemAcc.set(p.playerId, n)
      }
    }
  }

  // Sorted by the ABSOLUTE number of shared wins or losses — as the name
  // says. Sorted by rate, an ally with 2 games and 100 % would otherwise
  // rank above one with 20 games and 75 %.
  const allies = [...allyAcc.entries()]
    .map(([pid, v]) => ({ playerId: pid, games: v.games, wins: v.wins, winRate: v.games ? v.wins / v.games : 0 }))
    .filter((a) => a.games >= minGames)
    .sort((x, y) => y.wins - x.wins || y.winRate - x.winRate || y.games - x.games)

  const nemeses = [...nemAcc.entries()]
    .map(([pid, v]) => ({ playerId: pid, games: v.games, losses: v.losses, lossRate: v.games ? v.losses / v.games : 0 }))
    .filter((n) => n.games >= minGames)
    .sort((x, y) => y.losses - x.losses || y.lossRate - x.lossRate || y.games - x.games)

  return { allies, nemeses }
}

/**
 * Games per month, broken down by winner group — as counts. Deliberately
 * not rates: with one to four games per month a rate jumps between
 * 0 % and 100 % and shows noise instead of a trend.
 */
export function computeMonthly(records: GameResultRecord[]): MonthlyPoint[] {
  const buckets = new Map<string, MonthlyPoint>()
  for (const g of records) {
    const period = g.playedAt.slice(0, 7)
    let b = buckets.get(period)
    if (!b) {
      b = { period, games: 0, wins: emptyWins() }
      buckets.set(period, b)
    }
    b.games += 1
    b.wins[winnerGroupOf(g.winningCondition)] += 1
  }
  return [...buckets.values()].sort((a, b) => a.period.localeCompare(b.period))
}

function emptyWins(): Record<WinnerGroup, number> {
  return { village: 0, werewolves: 0, lovers: 0, solo: 0, none: 0 }
}

/** All winner groups that occur at all in these months. */
export function presentWinnerGroups(points: MonthlyPoint[]): WinnerGroup[] {
  return WINNER_GROUPS.filter((g) => points.some((p) => p.wins[g] > 0))
}
