import { describe, expect, it } from 'vitest'
import type { WinCondition } from '../domain/win-conditions.js'
import type { SetRating } from '../dto/game.js'
import { computeSetSuggestions, roleSetKey, setRatingFactor } from './sets.js'
import type { GameResultRecord } from './types.js'

const W = 'werewolf'
const D = 'villager'
const SEER = 'seer'
const WITCH = 'witch'
const HUNTER = 'hunter'

/** 6 players: 2 wolves, seer, witch, 2 villagers */
const SET_A = [W, W, SEER, WITCH, D, D]
/** 6 players: like A, but hunter instead of witch */
const SET_B = [W, W, SEER, HUNTER, D, D]
/** 7 players */
const SET_C = [W, W, SEER, WITCH, HUNTER, D, D]

let nextId = 0
function game(
  roleIds: string[],
  opts: { rating?: SetRating | null; playedAt?: string; win?: WinCondition } = {},
): GameResultRecord {
  nextId += 1
  return {
    gameId: `g${nextId}`,
    playedAt: opts.playedAt ?? '2026-05-01T20:00:00.000Z',
    mode: 'QUICK',
    winningCondition: opts.win ?? 'village',
    moderatorId: null,
    rounds: null,
    revealRolesOnDeath: null,
    setRating: opts.rating ?? null,
    players: roleIds.map((roleId, i) => ({
      playerId: `p${nextId}-${i}`,
      roleId,
      finalFaction: null,
      isWinner: false,
      survived: null,
      diedRound: null,
      deathCause: null,
    })),
  }
}

function keysFor(records: GameResultRecord[], playerCount: number): string[] {
  return computeSetSuggestions(records)
    .filter((s) => s.playerCount === playerCount)
    .map((s) => s.key)
}

describe('roleSetKey', () => {
  it('is independent of the order but counts duplicate roles', () => {
    expect(roleSetKey([W, SEER, W])).toBe(roleSetKey([SEER, W, W]))
    expect(roleSetKey([W, SEER, W])).not.toBe(roleSetKey([W, SEER]))
  })
})

describe('setRatingFactor', () => {
  it('is neutral at ★★★ and without feedback, doubles or halves per star', () => {
    expect(setRatingFactor(null)).toBe(1)
    expect(setRatingFactor(3)).toBe(1)
    expect(setRatingFactor(4)).toBe(2)
    expect(setRatingFactor(5)).toBe(4)
    expect(setRatingFactor(2)).toBe(0.5)
    expect(setRatingFactor(1)).toBe(0.25)
  })
})

describe('computeSetSuggestions', () => {
  it('groups games with the same role combination — regardless of who had which role', () => {
    const records = [game(SET_A), game([...SET_A].reverse()), game(SET_B)]
    const sets = computeSetSuggestions(records)
    expect(sets).toHaveLength(2)
    expect(sets[0]).toMatchObject({ key: roleSetKey(SET_A), playerCount: 6, games: 2 })
    expect(sets[1]).toMatchObject({ key: roleSetKey(SET_B), playerCount: 6, games: 1 })
  })

  it('separates by player count', () => {
    const records = [game(SET_A), game(SET_C), game(SET_C)]
    expect(keysFor(records, 6)).toEqual([roleSetKey(SET_A)])
    expect(keysFor(records, 7)).toEqual([roleSetKey(SET_C)])
    expect(keysFor(records, 8)).toEqual([])
  })

  it('without feedback: the most-played set first, on a tie the most recently played', () => {
    const records = [
      game(SET_A, { playedAt: '2026-05-01T20:00:00.000Z' }),
      game(SET_B, { playedAt: '2026-05-02T20:00:00.000Z' }),
    ]
    expect(keysFor(records, 6)).toEqual([roleSetKey(SET_B), roleSetKey(SET_A)])

    records.push(game(SET_A, { playedAt: '2026-04-01T20:00:00.000Z' }))
    expect(keysFor(records, 6)).toEqual([roleSetKey(SET_A), roleSetKey(SET_B)])
  })

  it('good feedback lifts a less often played set to the front', () => {
    const records = [game(SET_A), game(SET_A), game(SET_A), game(SET_B, { rating: 5 })]
    const [first, second] = computeSetSuggestions(records)
    expect(first).toMatchObject({ key: roleSetKey(SET_B), games: 1, avgRating: 5, score: 4 })
    expect(second).toMatchObject({ key: roleSetKey(SET_A), games: 3, avgRating: null, score: 3 })
  })

  it('a frequently played flop drops behind a less often played set', () => {
    const records = [
      game(SET_A, { rating: 1 }),
      game(SET_A, { rating: 1 }),
      game(SET_A),
      game(SET_A),
      game(SET_B),
      game(SET_B),
    ]
    const [first, second] = computeSetSuggestions(records)
    expect(first).toMatchObject({ key: roleSetKey(SET_B), score: 2 })
    expect(second).toMatchObject({ key: roleSetKey(SET_A), games: 4, ratedGames: 2, avgRating: 1, score: 1 })
  })

  it('unrated games count as played but do not shift the average (⌀) rating', () => {
    const [set] = computeSetSuggestions([game(SET_A, { rating: 4 }), game(SET_A, { rating: 5 }), game(SET_A)])
    expect(set.games).toBe(3)
    expect(set.ratedGames).toBe(2)
    expect(set.avgRating).toBe(4.5)
    // 3 games × 2^(4.5 − 3) ≈ 3 × 2.83
    expect(set.score).toBe(8.49)
  })

  it('counts the outcomes and remembers the last play date', () => {
    const [set] = computeSetSuggestions([
      game(SET_A, { win: 'village', playedAt: '2026-05-01T20:00:00.000Z' }),
      game(SET_A, { win: 'werewolves', playedAt: '2026-06-01T20:00:00.000Z' }),
      game(SET_A, { win: 'village', playedAt: '2026-04-01T20:00:00.000Z' }),
    ])
    expect(set.outcomes).toEqual({ village: 2, werewolves: 1, lovers: 0, solo: 0, none: 0 })
    expect(set.lastPlayedAt).toBe('2026-06-01T20:00:00.000Z')
  })

  it('returns the deck in catalog order, wolves first', () => {
    const [set] = computeSetSuggestions([game([WITCH, D, W, SEER, W, D])])
    expect(set.roleIds.slice(0, 2)).toEqual([W, W])
    expect([...set.roleIds].sort()).toEqual([...SET_A].sort())
  })

  it('omits sets with roles the catalog no longer knows', () => {
    expect(computeSetSuggestions([game([...SET_A.slice(1), 'does-not-exist'])])).toEqual([])
  })
})
