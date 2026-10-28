import type { ResolvedFaction } from '../domain/factions.js'
import { getRole } from '../domain/roles.js'
import type { WinCondition } from '../domain/win-conditions.js'
import { scoreGame, WINNER_GROUPS, type WinCategory, type WinnerGroup } from './scoring.js'
import type {
  FactionSplit,
  GamePlayerResult,
  GameResultRecord,
  GlobalStats,
  LeaderboardEntry,
  PlayerRoleStat,
  PlayerStat,
  RoleStat,
} from './types.js'

const RESOLVED_FACTIONS: ResolvedFaction[] = ['village', 'werewolves', 'solo']

export const DEFAULT_MIN_GAMES = 5

function emptySplit(): FactionSplit {
  return { games: 0, wins: 0, winRate: 0 }
}

function emptyFactionSplits(): Record<ResolvedFaction, FactionSplit> {
  return { village: emptySplit(), werewolves: emptySplit(), solo: emptySplit() }
}

function ratio(part: number, total: number): number {
  return total > 0 ? part / total : 0
}

/** Which countable faction does this player fall into in this game? */
export function resolvePlayerFaction(p: GamePlayerResult): ResolvedFaction | null {
  if (p.finalFaction && p.finalFaction !== 'variable') return p.finalFaction
  const base = getRole(p.roleId)?.faction
  if (base && base !== 'variable') return base
  return null
}

/** Game level: which faction won according to the win label? */
export function winConditionToFaction(wc: WinCondition): ResolvedFaction | null {
  switch (wc) {
    case 'village':
      return 'village'
    case 'werewolves':
      return 'werewolves'
    case 'pied-piper':
    case 'white-werewolf':
    case 'angel':
    case 'vampire':
    case 'serial-killer':
    case 'demon':
    case 'blob':
    case 'leech':
    case 'stone-golem':
    case 'groom':
    case 'rascal':
    case 'werehamster':
    case 'bella':
    case 'frida':
    case 'jason':
    case 'hermione':
    case 'gull':
      return 'solo'
    case 'lovers':
    case 'none':
    default:
      return null
  }
}

/**
 * Which points category does this player's win fall into? The game's win label
 * ("how was it won") is decisive; the player's faction only applies when the label
 * is unclear. Call for winners only.
 */
export function winCategoryOf(wc: WinCondition, playerFaction: ResolvedFaction | null): WinCategory {
  if (wc === 'lovers') return 'lovers'
  const faction = winConditionToFaction(wc) ?? playerFaction
  if (faction === 'werewolves') return 'werewolves'
  if (faction === 'solo') return 'solo'
  return 'village'
}

/**
 * Winner group of a game. Every game falls into exactly one — draw, abort and
 * unknown labels end up in "nobody".
 */
export function winnerGroupOf(wc: WinCondition): WinnerGroup {
  if (wc === 'lovers') return 'lovers'
  const faction = winConditionToFaction(wc)
  if (faction === 'village') return 'village'
  if (faction === 'werewolves') return 'werewolves'
  if (faction === 'solo') return 'solo'
  return 'none'
}

function emptyWinnerDistribution(): Record<WinnerGroup, number> {
  return { village: 0, werewolves: 0, lovers: 0, solo: 0, none: 0 }
}

interface PlayerAccum {
  results: Array<{
    playedAt: string
    isWinner: boolean
    faction: ResolvedFaction | null
    /** Win category for the points; null on a loss */
    category: WinCategory | null
  }>
}

function emptyWinCounts(): Record<WinCategory, number> {
  return { village: 0, werewolves: 0, lovers: 0, solo: 0 }
}

export interface LeaderboardOptions {
  minGames?: number
}

export function computeLeaderboard(
  records: GameResultRecord[],
  options: LeaderboardOptions = {},
): LeaderboardEntry[] {
  const minGames = options.minGames ?? DEFAULT_MIN_GAMES
  const byPlayer = new Map<string, PlayerAccum>()

  for (const game of records) {
    for (const p of game.players) {
      let acc = byPlayer.get(p.playerId)
      if (!acc) {
        acc = { results: [] }
        byPlayer.set(p.playerId, acc)
      }
      const faction = resolvePlayerFaction(p)
      acc.results.push({
        playedAt: game.playedAt,
        isWinner: p.isWinner,
        faction,
        category: p.isWinner ? winCategoryOf(game.winningCondition, faction) : null,
      })
    }
  }

  const entries: LeaderboardEntry[] = []
  for (const [playerId, acc] of byPlayer) {
    const sorted = [...acc.results].sort((a, b) => a.playedAt.localeCompare(b.playedAt))
    const games = sorted.length
    const wins = sorted.filter((r) => r.isWinner).length
    const byFaction = emptyFactionSplits()
    for (const r of sorted) {
      if (r.faction) {
        byFaction[r.faction].games += 1
        if (r.isWinner) byFaction[r.faction].wins += 1
      }
    }
    for (const f of RESOLVED_FACTIONS) byFaction[f].winRate = ratio(byFaction[f].wins, byFaction[f].games)

    // Streaks in chronological order — display only, they do not feed into the points.
    let runWin = 0
    let runLoss = 0
    let longestWinStreak = 0
    let longestLossStreak = 0
    let points = 0
    const pointsByCategory = emptyWinCounts()
    const winsByCategory = emptyWinCounts()

    for (const r of sorted) {
      if (r.isWinner) {
        runWin += 1
        runLoss = 0
        longestWinStreak = Math.max(longestWinStreak, runWin)
      } else {
        runLoss += 1
        runWin = 0
        longestLossStreak = Math.max(longestLossStreak, runLoss)
      }

      const gamePoints = scoreGame(r.category)
      points += gamePoints
      if (r.category) {
        pointsByCategory[r.category] += gamePoints
        winsByCategory[r.category] += 1
      }
    }

    const currentStreak = runWin > 0 ? runWin : -runLoss

    entries.push({
      playerId,
      games,
      wins,
      losses: games - wins,
      winRate: ratio(wins, games),
      qualified: games >= minGames,
      rank: null,
      byFaction,
      currentStreak,
      longestWinStreak,
      longestLossStreak,
      points,
      pointsPerGame: ratio(points, games),
      pointsByCategory,
      winsByCategory,
    })
  }

  // With an equal average the win rate decides. The number of games is deliberately
  // not a criterion — whoever is still level then shares the place.
  entries.sort((a, b) => {
    if (a.qualified !== b.qualified) return a.qualified ? -1 : 1
    return b.pointsPerGame - a.pointsPerGame || b.winRate - a.winRate
  })
  entries.forEach((e, i) => {
    if (!e.qualified) return
    const prev = entries[i - 1]
    const tied = prev?.qualified && prev.pointsPerGame === e.pointsPerGame && prev.winRate === e.winRate
    e.rank = tied ? prev.rank : i + 1
  })
  return entries
}

export function computePlayerRoleStats(records: GameResultRecord[]): PlayerRoleStat[] {
  const map = new Map<string, PlayerRoleStat>()
  for (const game of records) {
    for (const p of game.players) {
      const key = `${p.playerId}::${p.roleId}`
      let stat = map.get(key)
      if (!stat) {
        stat = { playerId: p.playerId, roleId: p.roleId, games: 0, wins: 0, winRate: 0 }
        map.set(key, stat)
      }
      stat.games += 1
      if (p.isWinner) stat.wins += 1
    }
  }
  const list = [...map.values()]
  for (const s of list) s.winRate = ratio(s.wins, s.games)
  return list.sort((a, b) => b.games - a.games || b.winRate - a.winRate)
}

export function computeRoleStats(records: GameResultRecord[]): RoleStat[] {
  const map = new Map<string, RoleStat & { _survivedCount: number; _diedRoundSum: number; _diedRoundCount: number }>()
  for (const game of records) {
    for (const p of game.players) {
      let s = map.get(p.roleId)
      if (!s) {
        s = {
          roleId: p.roleId,
          games: 0,
          wins: 0,
          winRate: 0,
          survivalSamples: 0,
          survivalRate: null,
          avgDiedRound: null,
          factionBaseline: null,
          winRateDelta: null,
          _survivedCount: 0,
          _diedRoundSum: 0,
          _diedRoundCount: 0,
        }
        map.set(p.roleId, s)
      }
      s.games += 1
      if (p.isWinner) s.wins += 1
      if (p.survived !== null && p.survived !== undefined) {
        s.survivalSamples += 1
        if (p.survived) s._survivedCount += 1
      }
      if (p.diedRound !== null && p.diedRound !== undefined) {
        s._diedRoundSum += p.diedRound
        s._diedRoundCount += 1
      }
    }
  }
  const baselines = factionBaselines(records)
  const list: RoleStat[] = []
  for (const s of map.values()) {
    s.winRate = ratio(s.wins, s.games)
    s.survivalRate = s.survivalSamples > 0 ? ratio(s._survivedCount, s.survivalSamples) : null
    s.avgDiedRound = s._diedRoundCount > 0 ? s._diedRoundSum / s._diedRoundCount : null
    // Reference value: the role's starting faction. Variable roles (Wolf-Hound, Wild
    // Child) have no fixed side and therefore no meaningful yardstick.
    const faction = getRole(s.roleId)?.faction
    if (faction && faction !== 'variable') {
      s.factionBaseline = baselines[faction]
      s.winRateDelta = s.winRate - baselines[faction]
    }
    const { _survivedCount, _diedRoundSum, _diedRoundCount, ...clean } = s
    list.push(clean)
  }
  return list.sort((a, b) => b.games - a.games)
}

export function computeGlobalStats(records: GameResultRecord[]): GlobalStats {
  const winnerDistribution = emptyWinnerDistribution()
  const winConditionDistribution: Record<string, number> = {}
  const deathCauseDistribution: Record<string, number> = {}
  const moderatorDistribution: Record<string, number> = {}
  const revealRolesDistribution = { on: 0, off: 0, unknown: 0 }
  let playerSum = 0
  let roundsSum = 0
  let roundsSamples = 0
  let liveGames = 0
  let survivalSamples = 0
  let survivedCount = 0

  for (const game of records) {
    if (game.mode === 'LIVE') {
      liveGames += 1
      // Live games only: quick capture has no moderation and therefore
      // no reveal rule either.
      if (game.revealRolesOnDeath === true) revealRolesDistribution.on += 1
      else if (game.revealRolesOnDeath === false) revealRolesDistribution.off += 1
      else revealRolesDistribution.unknown += 1
    }
    playerSum += game.players.length
    winConditionDistribution[game.winningCondition] =
      (winConditionDistribution[game.winningCondition] ?? 0) + 1
    winnerDistribution[winnerGroupOf(game.winningCondition)] += 1
    if (game.moderatorId) {
      moderatorDistribution[game.moderatorId] = (moderatorDistribution[game.moderatorId] ?? 0) + 1
    }

    if (game.rounds !== null && game.rounds !== undefined) {
      roundsSum += game.rounds
      roundsSamples += 1
    }
    for (const p of game.players) {
      if (p.deathCause) {
        deathCauseDistribution[p.deathCause] = (deathCauseDistribution[p.deathCause] ?? 0) + 1
      }
      if (p.survived !== null && p.survived !== undefined) {
        survivalSamples += 1
        if (p.survived) survivedCount += 1
      }
    }
  }

  const totalGames = records.length
  return {
    totalGames,
    liveGames,
    quickGames: totalGames - liveGames,
    winnerDistribution,
    winConditionDistribution,
    avgPlayersPerGame: totalGames > 0 ? playerSum / totalGames : 0,
    avgRounds: roundsSamples > 0 ? roundsSum / roundsSamples : null,
    roundsSamples,
    deathCauseDistribution,
    survivalSamples,
    survivalRate: survivalSamples > 0 ? ratio(survivedCount, survivalSamples) : null,
    moderatorDistribution,
    revealRolesDistribution,
  }
}

/**
 * Win rate per faction as a reference value: share of ALL games this faction
 * won. Yardstick for `RoleStat.winRateDelta`.
 */
function factionBaselines(records: GameResultRecord[]): Record<ResolvedFaction, number> {
  const dist = emptyWinnerDistribution()
  for (const game of records) dist[winnerGroupOf(game.winningCondition)] += 1
  const total = records.length
  // The lovers are a mixed outcome and cannot be attributed to a faction —
  // they therefore feed into no baseline but stay in the denominator.
  return {
    village: ratio(dist.village, total),
    werewolves: ratio(dist.werewolves, total),
    solo: ratio(dist.solo, total),
  }
}

/**
 * Character profile per player: rate by faction, survival, death causes,
 * role variety and moderated games.
 */
export function computePlayerStats(records: GameResultRecord[]): PlayerStat[] {
  interface Acc {
    games: number
    wins: number
    byFaction: Record<ResolvedFaction, FactionSplit>
    survivalSamples: number
    survivedCount: number
    diedRoundSum: number
    diedRoundCount: number
    deathCauses: Record<string, number>
    moderated: number
    roleGames: Map<string, number>
  }
  const byPlayer = new Map<string, Acc>()
  const acc = (id: string): Acc => {
    let a = byPlayer.get(id)
    if (!a) {
      a = {
        games: 0,
        wins: 0,
        byFaction: emptyFactionSplits(),
        survivalSamples: 0,
        survivedCount: 0,
        diedRoundSum: 0,
        diedRoundCount: 0,
        deathCauses: {},
        moderated: 0,
        roleGames: new Map(),
      }
      byPlayer.set(id, a)
    }
    return a
  }

  for (const game of records) {
    // Moderators do not play — they get an entry without games.
    if (game.moderatorId) acc(game.moderatorId).moderated += 1

    for (const p of game.players) {
      const a = acc(p.playerId)
      a.games += 1
      if (p.isWinner) a.wins += 1
      const faction = resolvePlayerFaction(p)
      if (faction) {
        a.byFaction[faction].games += 1
        if (p.isWinner) a.byFaction[faction].wins += 1
      }
      if (p.survived !== null && p.survived !== undefined) {
        a.survivalSamples += 1
        if (p.survived) a.survivedCount += 1
      }
      if (p.diedRound !== null && p.diedRound !== undefined) {
        a.diedRoundSum += p.diedRound
        a.diedRoundCount += 1
      }
      if (p.deathCause) a.deathCauses[p.deathCause] = (a.deathCauses[p.deathCause] ?? 0) + 1
      a.roleGames.set(p.roleId, (a.roleGames.get(p.roleId) ?? 0) + 1)
    }
  }

  const list: PlayerStat[] = []
  for (const [playerId, a] of byPlayer) {
    for (const f of RESOLVED_FACTIONS) a.byFaction[f].winRate = ratio(a.byFaction[f].wins, a.byFaction[f].games)

    const causes = Object.entries(a.deathCauses).sort((x, y) => y[1] - x[1])
    const roles = [...a.roleGames.entries()].sort((x, y) => y[1] - x[1])

    list.push({
      playerId,
      games: a.games,
      wins: a.wins,
      winRate: ratio(a.wins, a.games),
      byFaction: a.byFaction,
      survivalSamples: a.survivalSamples,
      survivalRate: a.survivalSamples > 0 ? ratio(a.survivedCount, a.survivalSamples) : null,
      avgDiedRound: a.diedRoundCount > 0 ? a.diedRoundSum / a.diedRoundCount : null,
      deathCauses: a.deathCauses,
      topDeathCause: causes.length > 0 ? { cause: causes[0][0], count: causes[0][1] } : null,
      moderated: a.moderated,
      topRole: roles.length > 0 ? { roleId: roles[0][0], games: roles[0][1] } : null,
      distinctRoles: a.roleGames.size,
    })
  }

  return list.sort((x, y) => y.games - x.games || y.winRate - x.winRate)
}
