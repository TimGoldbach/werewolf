import { describe, expect, it } from 'vitest'
import {
  computeGlobalStats,
  computeLeaderboard,
  computePlayerRoleStats,
  computeRoleStats,
  computePlayerStats,
  resolvePlayerFaction,
  winCategoryOf,
  winConditionToFaction,
  winnerGroupOf,
} from './compute.js'
import { SCORING } from './scoring.js'
import { WIN_CONDITIONS, type WinCondition } from '../domain/win-conditions.js'
import type { GameResultRecord } from './types.js'

const games: GameResultRecord[] = [
  {
    gameId: 'g1',
    playedAt: '2026-01-01T20:00:00.000Z',
    mode: 'QUICK',
    winningCondition: 'village',
    moderatorId: 'm1',
    rounds: null,
    revealRolesOnDeath: null,
    setRating: null,
    players: [
      { playerId: 'p1', roleId: 'seer', finalFaction: 'village', isWinner: true, survived: null, diedRound: null, deathCause: null },
      { playerId: 'p2', roleId: 'werewolf', finalFaction: 'werewolves', isWinner: false, survived: null, diedRound: null, deathCause: null },
      { playerId: 'p3', roleId: 'villager', finalFaction: 'village', isWinner: true, survived: null, diedRound: null, deathCause: null },
    ],
  },
  {
    gameId: 'g2',
    playedAt: '2026-01-08T20:00:00.000Z',
    mode: 'LIVE',
    winningCondition: 'werewolves',
    moderatorId: 'm1',
    rounds: 4,
    revealRolesOnDeath: true,
    setRating: 4,
    players: [
      { playerId: 'p1', roleId: 'werewolf', finalFaction: 'werewolves', isWinner: true, survived: true, diedRound: null, deathCause: null },
      { playerId: 'p2', roleId: 'seer', finalFaction: 'village', isWinner: false, survived: false, diedRound: 1, deathCause: 'werewolf' },
      { playerId: 'p3', roleId: 'villager', finalFaction: 'village', isWinner: false, survived: false, diedRound: 2, deathCause: 'lynch' },
    ],
  },
]

describe('resolvePlayerFaction', () => {
  it('uses finalFaction, otherwise the role base', () => {
    expect(resolvePlayerFaction(games[0].players[0])).toBe('village')
    expect(
      resolvePlayerFaction({ ...games[0].players[0], finalFaction: null }),
    ).toBe('village') // seer base = village
  })
})

describe('winConditionToFaction', () => {
  it('maps solo conditions to solo', () => {
    expect(winConditionToFaction('pied-piper')).toBe('solo')
    expect(winConditionToFaction('gull')).toBe('solo')
    expect(winConditionToFaction('village')).toBe('village')
    expect(winConditionToFaction('lovers')).toBeNull()
  })

  // The switch has a default branch: a newly added win condition would silently fall
  // to null without its own case and be missing from the faction balance.
  it('assigns every win condition — null only for the two documented exceptions', () => {
    const NULLABLE = new Set<WinCondition>(['lovers', 'none'])
    for (const wc of WIN_CONDITIONS) {
      const faction = winConditionToFaction(wc)
      if (NULLABLE.has(wc)) {
        expect(faction, `"${wc}" should have no faction`).toBeNull()
      } else {
        expect(faction, `"${wc}" falls into the default branch — missing case?`).not.toBeNull()
      }
    }
  })
})

describe('computeLeaderboard', () => {
  const lb = computeLeaderboard(games, { minGames: 2 })
  it('counts games and wins per player', () => {
    const p1 = lb.find((e) => e.playerId === 'p1')!
    expect(p1.games).toBe(2)
    expect(p1.wins).toBe(2)
    expect(p1.winRate).toBe(1)
    expect(p1.qualified).toBe(true)
  })
  it('computes faction splits', () => {
    const p1 = lb.find((e) => e.playerId === 'p1')!
    expect(p1.byFaction.village).toEqual({ games: 1, wins: 1, winRate: 1 })
    expect(p1.byFaction.werewolves).toEqual({ games: 1, wins: 1, winRate: 1 })
  })
  it('computes the current streak chronologically', () => {
    const p2 = lb.find((e) => e.playerId === 'p2')!
    expect(p2.wins).toBe(0)
    expect(p2.currentStreak).toBe(-2)
    expect(p2.longestWinStreak).toBe(0)
  })
  it('sorts by points per game and assigns places', () => {
    expect(lb.map((e) => [e.playerId, e.rank])).toEqual([
      ['p1', 1],
      ['p3', 2],
      ['p2', 3],
    ])
  })

  it('awards points for wins only, graded by category', () => {
    expect(lb.find((e) => e.playerId === 'p1')!.points).toBe(SCORING.win.village + SCORING.win.werewolves)
    expect(lb.find((e) => e.playerId === 'p3')!.points).toBe(SCORING.win.village)
    expect(lb.find((e) => e.playerId === 'p2')!.points).toBe(0)
  })

  it('provides a breakdown that adds up exactly to the points', () => {
    for (const e of lb) {
      expect(Object.values(e.pointsByCategory).reduce((a, v) => a + v, 0)).toBe(e.points)
      expect(e.pointsPerGame).toBeCloseTo(e.points / e.games)
    }
  })

  it('counts wins per category', () => {
    const p1 = lb.find((e) => e.playerId === 'p1')!
    expect(p1.winsByCategory).toEqual({ village: 1, werewolves: 1, lovers: 0, solo: 0 })
  })

  it('detects the longest losing streak', () => {
    expect(lb.find((e) => e.playerId === 'p2')!.longestLossStreak).toBe(2)
    expect(lb.find((e) => e.playerId === 'p1')!.longestLossStreak).toBe(0)
  })
})

describe('winCategoryOf', () => {
  it('turns the lovers win into its own category', () => {
    expect(winCategoryOf('lovers', 'village')).toBe('lovers')
  })
  it('maps solo win conditions to solo', () => {
    expect(winCategoryOf('pied-piper', 'solo')).toBe('solo')
    expect(winCategoryOf('werehamster', 'village')).toBe('solo')
  })
  it('falls back to the player\'s faction when the label is unclear', () => {
    expect(winCategoryOf('none', 'werewolves')).toBe('werewolves')
    expect(winCategoryOf('none', null)).toBe('village')
  })
})

describe('leaderboard by points average', () => {
  /** Games of a single player: win condition = won, `false` = lost. */
  function history(playerId: string, results: Array<WinCondition | false>): GameResultRecord[] {
    return results.map((r, i) => ({
      gameId: `${playerId}${i}`,
      playedAt: `2026-03-${String(i + 1).padStart(2, '0')}T20:00:00.000Z`,
      mode: 'QUICK' as const,
      winningCondition: r === false ? 'werewolves' : r,
      moderatorId: null,
      rounds: null,
      revealRolesOnDeath: null,
      setRating: null,
      players: [
        { playerId, roleId: 'villager', finalFaction: 'village' as const, isWinner: r !== false, survived: null, diedRound: null, deathCause: null },
      ],
    }))
  }

  const lb = computeLeaderboard(
    [
      ...history('few', ['village', false]),
      ...history('many', ['village', false, 'village', false, 'village', false, 'village', false, 'village', false]),
      ...history('solo', ['pied-piper', false, false, false, false, false]),
      ...history('unlucky', [false, false, false]),
      ...history('newcomer', ['pied-piper']),
    ],
    { minGames: 2 },
  )
  const entry = (id: string) => lb.find((e) => e.playerId === id)!

  it('scores the same record the same — no matter how many games are behind it', () => {
    expect(entry('few').pointsPerGame).toBe(SCORING.win.village / 2)
    expect(entry('many').pointsPerGame).toBe(entry('few').pointsPerGame)
    expect(entry('many').rank).toBe(entry('few').rank)
  })

  it('lets the win rate decide on an equal average, after that the place is shared', () => {
    // one solo win in six games yields the same average as one village win in two
    expect(entry('solo').pointsPerGame).toBe(entry('few').pointsPerGame)
    expect(Object.fromEntries(lb.map((e) => [e.playerId, e.rank]))).toEqual({
      few: 1,
      many: 1,
      solo: 3,
      unlucky: 4,
      newcomer: null,
    })
  })

  it('lists non-qualified players without a place at the back — even with the best average', () => {
    expect(entry('newcomer').pointsPerGame).toBe(SCORING.win.solo)
    expect(lb[lb.length - 1].playerId).toBe('newcomer')
  })

  it('gives no extra points for streaks', () => {
    const [p] = computeLeaderboard(history('p', ['village', 'village', 'village', 'village', 'village', 'village']), { minGames: 1 })
    expect(p.longestWinStreak).toBe(6)
    expect(p.points).toBe(6 * SCORING.win.village)
    expect(p.pointsPerGame).toBe(SCORING.win.village)
  })

  it('counts a solo win higher than a werewolf or village win', () => {
    expect(SCORING.win.solo).toBeGreaterThan(SCORING.win.lovers)
    expect(SCORING.win.lovers).toBeGreaterThan(SCORING.win.werewolves)
    expect(SCORING.win.werewolves).toBeGreaterThan(SCORING.win.village)
  })
})

describe('computePlayerRoleStats', () => {
  it('aggregates per player+role', () => {
    const stats = computePlayerRoleStats(games)
    const p1Werewolf = stats.find((s) => s.playerId === 'p1' && s.roleId === 'werewolf')!
    expect(p1Werewolf.games).toBe(1)
    expect(p1Werewolf.wins).toBe(1)
  })
})

describe('computeRoleStats', () => {
  it('computes survival from live data only', () => {
    const stats = computeRoleStats(games)
    const seer = stats.find((s) => s.roleId === 'seer')!
    expect(seer.games).toBe(2)
    expect(seer.survivalSamples).toBe(1) // only g2 had survived info
    expect(seer.survivalRate).toBe(0)
  })
})

describe('computeGlobalStats', () => {
  const g = computeGlobalStats(games)
  it('counts modes', () => {
    expect(g.totalGames).toBe(2)
    expect(g.liveGames).toBe(1)
    expect(g.quickGames).toBe(1)
  })

  it('distributes the wins across the winner groups', () => {
    expect(g.winnerDistribution).toEqual({ village: 1, werewolves: 1, lovers: 0, solo: 0, none: 0 })
  })

  // The former factionBalance counted every faction as involved in EVERY game
  // and left out lovers/nobody — the shares never added up to 100 %.
  it('the winner distribution sums exactly to the game count', () => {
    const sum = Object.values(g.winnerDistribution).reduce((a, v) => a + v, 0)
    expect(sum).toBe(g.totalGames)
  })

  it('states the sample size for average rounds instead of hiding it', () => {
    expect(g.roundsSamples).toBe(1) // only g2 is a live game with a round count
    expect(g.avgRounds).toBe(4)
  })

  it('distributes death causes from live games', () => {
    expect(g.deathCauseDistribution.werewolf).toBe(1)
    expect(g.deathCauseDistribution.lynch).toBe(1)
  })

  it('computes the survival rate from entries with known info only', () => {
    expect(g.survivalSamples).toBe(3) // only the three players from g2
    expect(g.survivalRate).toBeCloseTo(1 / 3)
  })

  it('counts moderated games per moderator', () => {
    expect(g.moderatorDistribution).toEqual({ m1: 2 })
  })

  // One live game with revealRolesOnDeath=true, one in quick mode (does not count).
  it('counts the reveal rule across live games only', () => {
    expect(g.revealRolesDistribution).toEqual({ on: 1, off: 0, unknown: 0 })
    const sum = Object.values(g.revealRolesDistribution).reduce((a, v) => a + v, 0)
    expect(sum).toBe(g.liveGames)
  })

  it('does not silently count an unknown rule as "off"', () => {
    const withUnknown = computeGlobalStats([
      { ...games[1], gameId: 'alt', revealRolesOnDeath: null },
      ...games,
    ])
    expect(withUnknown.revealRolesDistribution).toEqual({ on: 1, off: 0, unknown: 1 })
  })
})

describe('winnerGroupOf', () => {
  it('gives every game exactly one group', () => {
    expect(winnerGroupOf('village')).toBe('village')
    expect(winnerGroupOf('lovers')).toBe('lovers')
    expect(winnerGroupOf('gull')).toBe('solo')
    expect(winnerGroupOf('none')).toBe('none')
  })
})

describe('computePlayerStats', () => {
  const stats = computePlayerStats(games)
  const p1 = stats.find((s) => s.playerId === 'p1')!

  it('counts games, wins and faction splits', () => {
    expect(p1.games).toBe(2)
    expect(p1.wins).toBe(2)
    expect(p1.byFaction.village).toEqual({ games: 1, wins: 1, winRate: 1 })
  })

  it('derives survival from live data only', () => {
    expect(p1.survivalSamples).toBe(1)
    expect(p1.survivalRate).toBe(1)
    const p2 = stats.find((s) => s.playerId === 'p2')!
    expect(p2.survivalRate).toBe(0)
    expect(p2.avgDiedRound).toBe(1)
  })

  it('names the most frequent death cause and role variety', () => {
    const p2 = stats.find((s) => s.playerId === 'p2')!
    expect(p2.topDeathCause).toEqual({ cause: 'werewolf', count: 1 })
    expect(p2.distinctRoles).toBe(2)
    expect(p1.topRole).not.toBeNull()
  })

  it('lists moderators with moderated games but without playing', () => {
    const mod = stats.find((s) => s.playerId === 'm1')!
    expect(mod.moderated).toBe(2)
    expect(mod.games).toBe(0)
  })
})
