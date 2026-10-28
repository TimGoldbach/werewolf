import { describe, expect, it } from 'vitest'
import { SCORING, scoreGame } from './scoring.js'

describe('scoreGame', () => {
  it('scores wins by category: village < werewolves < lovers < solo', () => {
    const cats = (['village', 'werewolves', 'lovers', 'solo'] as const).map((c) => scoreGame(c))
    expect(cats).toEqual([...cats].sort((a, b) => a - b))
    expect(new Set(cats).size).toBe(4)
  })

  it('takes the win points from SCORING', () => {
    expect(scoreGame('solo')).toBe(SCORING.win.solo)
  })

  it('awards nothing for a loss', () => {
    expect(scoreGame(null)).toBe(0)
  })
})
