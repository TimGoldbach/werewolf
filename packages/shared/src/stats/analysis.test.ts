import { describe, expect, it } from 'vitest'
import {
  computeHeadToHead,
  computeMonthly,
  computeSynergy,
  filterRecords,
  presentWinnerGroups,
} from './analysis.js'
import type { GameResultRecord } from './types.js'

function game(
  id: string,
  playedAt: string,
  winningCondition: GameResultRecord['winningCondition'],
  players: Array<[string, string, 'village' | 'werewolves' | 'solo', boolean]>,
): GameResultRecord {
  return {
    gameId: id,
    playedAt,
    mode: 'QUICK',
    winningCondition,
    moderatorId: null,
    rounds: null,
    revealRolesOnDeath: null,
    setRating: null,
    players: players.map(([playerId, roleId, finalFaction, isWinner]) => ({
      playerId,
      roleId,
      finalFaction,
      isWinner,
      survived: null,
      diedRound: null,
      deathCause: null,
    })),
  }
}

const records: GameResultRecord[] = [
  game('g1', '2026-01-01T20:00:00.000Z', 'village', [
    ['p1', 'seer', 'village', true],
    ['p2', 'werewolf', 'werewolves', false],
    ['p3', 'villager', 'village', true],
  ]),
  game('g2', '2026-02-01T20:00:00.000Z', 'werewolves', [
    ['p1', 'werewolf', 'werewolves', true],
    ['p2', 'seer', 'village', false],
    ['p3', 'villager', 'village', false],
  ]),
  game('g3', '2026-02-15T20:00:00.000Z', 'werewolves', [
    ['p1', 'seer', 'village', false],
    ['p2', 'werewolf', 'werewolves', true],
    ['p4', 'villager', 'village', false],
  ]),
]

describe('filterRecords', () => {
  it('filters by time range', () => {
    expect(filterRecords(records, { from: '2026-02-01T00:00:00.000Z' }).map((g) => g.gameId)).toEqual(['g2', 'g3'])
  })
  it('treats date-only bounds as day-inclusive (from & to symmetric)', () => {
    // to on 2026-02-01 must include g2 (on that day, 8 pm) and exclude g3
    expect(filterRecords(records, { to: '2026-02-01' }).map((g) => g.gameId)).toEqual(['g1', 'g2'])
    expect(filterRecords(records, { from: '2026-02-01' }).map((g) => g.gameId)).toEqual(['g2', 'g3'])
  })
  it('filters by player (at least one participant)', () => {
    expect(filterRecords(records, { playerIds: ['p4'] }).map((g) => g.gameId)).toEqual(['g3'])
  })
  it('filters by faction', () => {
    expect(filterRecords(records, { factions: ['solo'] })).toHaveLength(0)
    expect(filterRecords(records, { factions: ['werewolves'] })).toHaveLength(3)
  })
})

describe('computeHeadToHead', () => {
  it('counts shared and opposing games correctly', () => {
    const h = computeHeadToHead(records, 'p1', 'p2')
    expect(h.bothGames).toBe(3)
    expect(h.sameTeam.games).toBe(0)
    expect(h.opposite).toEqual({ games: 3, aWins: 2, bWins: 1 })
    expect(h.a.wins).toBe(2)
    expect(h.b.wins).toBe(1)
  })
})

describe('computeSynergy', () => {
  it('finds nemeses (losses against)', () => {
    const s = computeSynergy(records, 'p1') // minGames 2
    expect(s.nemeses).toHaveLength(1)
    expect(s.nemeses[0]).toMatchObject({ playerId: 'p2', games: 3, losses: 1 })
  })
  it('finds allies from minGames=1', () => {
    const s = computeSynergy(records, 'p1', { minGames: 1 })
    const p3 = s.allies.find((a) => a.playerId === 'p3')
    expect(p3).toMatchObject({ games: 1, wins: 1, winRate: 1 })
  })
})

describe('computeMonthly', () => {
  it('counts games per month by winner group — as counts, not as rates', () => {
    expect(computeMonthly(records)).toEqual([
      { period: '2026-01', games: 1, wins: { village: 1, werewolves: 0, lovers: 0, solo: 0, none: 0 } },
      { period: '2026-02', games: 2, wins: { village: 0, werewolves: 2, lovers: 0, solo: 0, none: 0 } },
    ])
  })

  it('the winner counts of a month sum to the month\'s games', () => {
    for (const point of computeMonthly(records)) {
      const sum = Object.values(point.wins).reduce((a, v) => a + v, 0)
      expect(sum, `Month ${point.period}`).toBe(point.games)
    }
  })
})

describe('presentWinnerGroups', () => {
  it('names only groups that occur at all', () => {
    expect(presentWinnerGroups(computeMonthly(records))).toEqual(['village', 'werewolves'])
  })
})
