import { ROLE_CATALOG } from '../domain/roles.js'
import { isSetRating } from '../dto/game.js'
import { winnerGroupOf } from './compute.js'
import type { WinnerGroup } from './scoring.js'
import type { GameResultRecord } from './types.js'

/**
 * Set suggestions: role combinations ("sets") the group has already played — per
 * player count, the most proven first. Sorted by `games × feedback factor`:
 *
 *  1. **Frequency counts.** Without feedback the most-played set comes first.
 *  2. **Feedback weights.** The decisive value is the average (⌀) rating of the rated games: at
 *     ★★★ ("Okay") the weight stays simple, every star more doubles it, every
 *     star fewer halves it. A frequently played flop thus drops behind a less often
 *     played favourite set.
 *  3. **Unrated is neutral.** Games without feedback (including all from before feedback existed)
 *     count as played but do not shift the average (⌀) rating.
 *
 * Like the leaderboard, deliberately simple enough to recompute with pen and paper.
 */

/** Rating that leaves a set's weight unchanged ("Okay"). */
export const NEUTRAL_SET_RATING = 3

/**
 * Feedback factor from the average (⌀) rating: every star above ★★★ doubles, every one below
 * halves (★ = ¼, ★★ = ½, ★★★ = 1, ★★★★ = 2, ★★★★★ = 4). Without feedback 1.
 */
export function setRatingFactor(avgRating: number | null): number {
  return avgRating === null ? 1 : 2 ** (avgRating - NEUTRAL_SET_RATING)
}

export interface SetSuggestion {
  /** Key of the set, see `roleSetKey` */
  key: string
  /** Number of roles = number of players */
  playerCount: number
  /** the deck in catalog order (wolves first), duplicate roles repeated */
  roleIds: string[]
  /** how often exactly this set was played */
  games: number
  /** of those, with feedback */
  ratedGames: number
  /** average (⌀) rating of the rated games (1–5); `null` = no feedback yet */
  avgRating: number | null
  /** Suggestion weight = `games × setRatingFactor(avgRating)`, rounded to 2 decimals */
  score: number
  /** Outcome of the games per winner group */
  outcomes: Record<WinnerGroup, number>
  /** last played (ISO timestamp) */
  lastPlayedAt: string
}

/** Key of a set — independent of the order in which the roles appear. */
export function roleSetKey(roleIds: readonly string[]): string {
  return [...roleIds].sort().join('|')
}

const CATALOG_INDEX = new Map(ROLE_CATALOG.map((r, i) => [r.id, i]))

function emptyOutcomes(): Record<WinnerGroup, number> {
  return { village: 0, werewolves: 0, lovers: 0, solo: 0, none: 0 }
}

interface SetAccum {
  roleIds: string[]
  games: number
  ratings: number[]
  outcomes: Record<WinnerGroup, number>
  lastPlayedAt: string
}

/**
 * All sets played so far, descending by suggestion weight (on a tie: played more often,
 * then most recently played). For N players, filter on `playerCount === N`.
 * Sets with roles the catalog no longer knows are no longer playable and are omitted.
 */
export function computeSetSuggestions(records: GameResultRecord[]): SetSuggestion[] {
  const byKey = new Map<string, SetAccum>()
  for (const game of records) {
    const roleIds = game.players.map((p) => p.roleId)
    if (roleIds.length === 0 || roleIds.some((id) => !CATALOG_INDEX.has(id))) continue
    const key = roleSetKey(roleIds)
    let acc = byKey.get(key)
    if (!acc) {
      acc = {
        roleIds: [...roleIds].sort((a, b) => CATALOG_INDEX.get(a)! - CATALOG_INDEX.get(b)!),
        games: 0,
        ratings: [],
        outcomes: emptyOutcomes(),
        lastPlayedAt: game.playedAt,
      }
      byKey.set(key, acc)
    }
    acc.games += 1
    if (isSetRating(game.setRating)) acc.ratings.push(game.setRating)
    acc.outcomes[winnerGroupOf(game.winningCondition)] += 1
    if (game.playedAt > acc.lastPlayedAt) acc.lastPlayedAt = game.playedAt
  }

  return [...byKey.entries()]
    .map(([key, acc]): SetSuggestion => {
      const avgRating =
        acc.ratings.length > 0 ? acc.ratings.reduce((sum, r) => sum + r, 0) / acc.ratings.length : null
      return {
        key,
        playerCount: acc.roleIds.length,
        roleIds: acc.roleIds,
        games: acc.games,
        ratedGames: acc.ratings.length,
        avgRating,
        score: Math.round(acc.games * setRatingFactor(avgRating) * 100) / 100,
        outcomes: acc.outcomes,
        lastPlayedAt: acc.lastPlayedAt,
      }
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.games - a.games ||
        b.lastPlayedAt.localeCompare(a.lastPlayedAt) ||
        a.key.localeCompare(b.key),
    )
}
