import type { Faction, ResolvedFaction } from '../domain/factions.js'
import type { DeathCause, GameMode, SetRating } from '../dto/game.js'
import type { WinCondition } from '../domain/win-conditions.js'
import type { WinCategory, WinnerGroup } from './scoring.js'

/** Persisted result view of a participant (projection, not an event). */
export interface GamePlayerResult {
  playerId: string
  roleId: string
  finalFaction: Faction | null
  isWinner: boolean
  /** was alive at the end of the game (live games only); null = unknown (quick entry) */
  survived: boolean | null
  /** Round of death (0 = first night); null = survived or unknown */
  diedRound: number | null
  deathCause: DeathCause | null
}

export interface GameResultRecord {
  gameId: string
  playedAt: string
  mode: GameMode
  winningCondition: WinCondition
  moderatorId: string | null
  /** Number of rounds (live only); null = unknown */
  rounds: number | null
  /**
   * House rule of the game: reveal roles after death? `null` for quick games
   * (not applicable) and for live games from before the setting existed.
   */
  revealRolesOnDeath: boolean | null
  /** The group's feedback on the set (1–5); `null` = not rated */
  setRating: SetRating | null
  players: GamePlayerResult[]
}

export interface FactionSplit {
  games: number
  wins: number
  winRate: number
}

export interface LeaderboardEntry {
  playerId: string
  games: number
  wins: number
  losses: number
  winRate: number
  qualified: boolean
  /**
   * Place on the leaderboard (1 = first), `null` without qualification. Those who
   * are level share the place: 1, 1, 3, …
   */
  rank: number | null
  byFaction: Record<ResolvedFaction, FactionSplit>
  currentStreak: number
  longestWinStreak: number
  longestLossStreak: number
  /** Sum of the win points from all games (see `SCORING`) */
  points: number
  /**
   * Leaderboard value: `points / games`. Depends only on the results, not on
   * how many games someone has played.
   */
  pointsPerGame: number
  /** Win points per category — the sum equals `points` exactly. */
  pointsByCategory: Record<WinCategory, number>
  /** Number of wins per win category */
  winsByCategory: Record<WinCategory, number>
}

export interface PlayerRoleStat {
  playerId: string
  roleId: string
  games: number
  wins: number
  winRate: number
}

export interface RoleStat {
  roleId: string
  games: number
  wins: number
  winRate: number
  /** only from live games with known survival info */
  survivalSamples: number
  survivalRate: number | null
  avgDiedRound: number | null
  /**
   * Win rate of this role's faction across ALL games — the yardstick `winRate`
   * has to be measured against. A village role at 50 % is unremarkable if
   * the village wins 50 % anyway. `null` for a variable faction (Wolf-Hound & co.).
   */
  factionBaseline: number | null
  /** winRate − factionBaseline; positive = the role helps its side. */
  winRateDelta: number | null
}

/**
 * Character profile of a player — answers "what kind of player is this?",
 * not "who is leading?" (that is the leaderboard).
 */
export interface PlayerStat {
  playerId: string
  games: number
  wins: number
  winRate: number
  byFaction: Record<ResolvedFaction, FactionSplit>
  /** live games with known survival info only */
  survivalSamples: number
  survivalRate: number | null
  /** Average round of death (only where known) */
  avgDiedRound: number | null
  /** Count per death cause */
  deathCauses: Record<string, number>
  /** most frequent death cause with count */
  topDeathCause: { cause: string; count: number } | null
  /** Games this person moderated (and therefore did not play in) */
  moderated: number
  /** most-played role with count */
  topRole: { roleId: string; games: number } | null
  /** Number of distinct roles played */
  distinctRoles: number
}

/** Filter for the statistics views (applied client-side to the records). */
export interface StatsFilter {
  from?: string | null
  to?: string | null
  playerIds?: string[]
  roleIds?: string[]
  factions?: ResolvedFaction[]
}

export interface H2HSummary {
  playerId: string
  games: number
  wins: number
  winRate: number
}

export interface HeadToHead {
  a: H2HSummary
  b: H2HSummary
  bothGames: number
  sameTeam: { games: number; coWins: number }
  opposite: { games: number; aWins: number; bWins: number }
}

export interface SynergyEntry {
  playerId: string
  games: number
  wins: number
  winRate: number
}

export interface NemesisEntry {
  playerId: string
  games: number
  losses: number
  lossRate: number
}

export interface Synergy {
  allies: SynergyEntry[]
  nemeses: NemesisEntry[]
}

/**
 * Games of a month, broken down by winner group — as COUNTS, not as
 * rates: with one to four games per month a rate would be pure noise
 * (a single game yields 0 % or 100 %).
 */
export interface MonthlyPoint {
  /** YYYY-MM */
  period: string
  games: number
  wins: Record<WinnerGroup, number>
}

export interface GlobalStats {
  totalGames: number
  liveGames: number
  quickGames: number
  /**
   * How many games each winner group won. Sums to exactly
   * `totalGames` — unlike the former `factionBalance`, in which every faction
   * counted as "involved" in every game and lovers/nobody were missing.
   */
  winnerDistribution: Record<WinnerGroup, number>
  winConditionDistribution: Record<string, number>
  avgPlayersPerGame: number
  /** Average rounds — live games only; `roundsSamples` gives the sample size. */
  avgRounds: number | null
  roundsSamples: number
  deathCauseDistribution: Record<string, number>
  /** Player entries with known survival info (live only) */
  survivalSamples: number
  /** Share of those that lived to see the end of the game */
  survivalRate: number | null
  /** Number of moderated games per moderator */
  moderatorDistribution: Record<string, number>
  /**
   * How often each reveal rule was played. Live games only; `unknown`
   * are games from before the setting existed — they are not silently
   * counted as "off".
   */
  revealRolesDistribution: { on: number; off: number; unknown: number }
}
