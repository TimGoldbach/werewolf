import { describe, expect, it } from 'vitest'
import { deriveState, evaluateWin, presentRoleIds } from './engine.js'
import type { EngineEvent, SetupPlayer } from './state.js'

function setup(players: SetupPlayer[]): EngineEvent {
  return { type: 'SetupCompleted', payload: { players } }
}

const ROLES = {
  wolf: 'werewolf',
  seer: 'seer',
  hunter: 'hunter',
  witch: 'witch',
  elder: 'elder',
  piper: 'pied-piper',
  villager: 'villager',
}

function p(playerId: string, roleId: string, _seatIndex?: number): SetupPlayer {
  return { playerId, roleId }
}

describe('Role assignment on wake-up (deck model)', () => {
  // Live setup: players + deck only, no binding yet.
  const deck = [ROLES.wolf, ROLES.seer, ROLES.villager]
  const liveSetup: EngineEvent = {
    type: 'SetupCompleted',
    payload: { players: [{ playerId: 'a' }, { playerId: 'b' }, { playerId: 'c' }], roles: deck },
  }

  it('creates players without a role and fills the deck pool', () => {
    const s = deriveState([liveSetup])
    expect(s.players.every((p) => p.roleId === null)).toBe(true)
    expect(s.players.every((p) => p.faction === 'village')).toBe(true)
    expect([...s.unassignedRoles].sort()).toEqual([...deck].sort())
  })

  it('the wake-up order is fed from the deck, even if nobody is assigned', () => {
    const s = deriveState([liveSetup])
    expect(presentRoleIds(s).sort()).toEqual([...deck].sort())
  })

  it('RoleAssigned binds the role, sets the faction and clears the pool entry', () => {
    const s = deriveState([
      liveSetup,
      { type: 'RoleAssigned', payload: { playerId: 'a', roleId: ROLES.wolf } },
    ])
    const a = s.players.find((p) => p.playerId === 'a')!
    expect(a.roleId).toBe(ROLES.wolf)
    expect(a.faction).toBe('werewolves')
    expect(s.unassignedRoles).not.toContain(ROLES.wolf)
    expect(s.unassignedRoles).toContain(ROLES.seer)
  })

  it('RoleAssigned on an already assigned player swaps the role and keeps the deck consistent', () => {
    const s = deriveState([
      liveSetup,
      { type: 'RoleAssigned', payload: { playerId: 'a', roleId: ROLES.wolf } },
      // Correction: a was not the wolf after all, but the plain villager.
      { type: 'RoleAssigned', payload: { playerId: 'a', roleId: ROLES.villager } },
    ])
    const a = s.players.find((p) => p.playerId === 'a')!
    expect(a.roleId).toBe(ROLES.villager)
    expect(a.faction).toBe('village')
    // The old wolf card is back in the deck, the new villager card no longer is.
    expect(s.unassignedRoles).toContain(ROLES.wolf)
    expect(s.unassignedRoles).not.toContain(ROLES.villager)
    // Deck multiset stays complete (1× wolf + 1× seer in the pool, a holds villager).
    expect([...s.unassignedRoles].sort()).toEqual([ROLES.wolf, ROLES.seer].sort())
  })

  it('RoleAssigned with an identical role is a no-op (deck pool stays untouched)', () => {
    const s = deriveState([
      liveSetup,
      { type: 'RoleAssigned', payload: { playerId: 'a', roleId: ROLES.wolf } },
      { type: 'RoleAssigned', payload: { playerId: 'a', roleId: ROLES.wolf } },
    ])
    expect(s.players.find((p) => p.playerId === 'a')!.roleId).toBe(ROLES.wolf)
    expect([...s.unassignedRoles].sort()).toEqual([ROLES.seer, ROLES.villager].sort())
  })

  it('undo (replay without the last RoleAssigned) puts the role back into the pool', () => {
    const withAssign = deriveState([
      liveSetup,
      { type: 'RoleAssigned', payload: { playerId: 'a', roleId: ROLES.wolf } },
    ])
    const undone = deriveState([liveSetup]) // last event removed
    expect(withAssign.players.find((p) => p.playerId === 'a')!.roleId).toBe(ROLES.wolf)
    expect(undone.players.find((p) => p.playerId === 'a')!.roleId).toBeNull()
    expect(undone.unassignedRoles).toContain(ROLES.wolf)
  })

  it('suggests NO winner while wolves/solo roles are still unassigned in the deck (regression)', () => {
    // Live start: nobody has a role, everyone provisionally counts as village.
    // Previously "village wins" was suggested immediately → the game was over right away.
    const start = deriveState([liveSetup])
    expect(evaluateWin(start)).toBeNull()

    // No winner in the first night either, before the wolves are bound.
    const night1 = deriveState([liveSetup, { type: 'NightStarted', payload: {} }])
    expect(evaluateWin(night1)).toBeNull()
  })

  it('suggests a village win once all wolves are bound and dead (deck only village left)', () => {
    const s = deriveState([
      liveSetup,
      { type: 'RoleAssigned', payload: { playerId: 'a', roleId: ROLES.wolf } },
      { type: 'RoleAssigned', payload: { playerId: 'b', roleId: ROLES.seer } },
      { type: 'NightStarted', payload: {} },
      { type: 'Killed', payload: { playerId: 'a', cause: 'lynch' } },
    ])
    // Only 'villager' (c) is still unassigned → no hidden threat.
    expect(evaluateWin(s)).toEqual({ condition: 'village', winnerIds: ['b', 'c'] })
  })

  it('angel instant win is detected as soon as the player is bound (via RoleAssigned)', () => {
    const s = deriveState([
      {
        type: 'SetupCompleted',
        payload: { players: [{ playerId: 'e' }, { playerId: 'w' }, { playerId: 'b' }], roles: ['angel', ROLES.wolf, ROLES.seer] },
      },
      { type: 'RoleAssigned', payload: { playerId: 'e', roleId: 'angel' } },
      { type: 'OpeningDayStarted', payload: {} },
      { type: 'Lynched', payload: { targetId: 'e' } },
    ])
    expect(evaluateWin(s)).toEqual({ condition: 'angel', winnerIds: ['e'] })
  })

  it('duplicate roles (e.g. two wolves) are removed from the pool individually', () => {
    const twoWolves: EngineEvent = {
      type: 'SetupCompleted',
      payload: {
        players: [{ playerId: 'a' }, { playerId: 'b' }, { playerId: 'c' }],
        roles: [ROLES.wolf, ROLES.wolf, ROLES.seer],
      },
    }
    const s = deriveState([
      twoWolves,
      { type: 'RoleAssigned', payload: { playerId: 'a', roleId: ROLES.wolf } },
    ])
    expect(s.unassignedRoles.filter((r) => r === ROLES.wolf)).toHaveLength(1)
  })
})

describe('Death cascade: lovers', () => {
  it('partner dies of heartbreak too', () => {
    const s = deriveState([
      setup([p('a', ROLES.wolf, 0), p('b', ROLES.seer, 1), p('c', ROLES.villager, 2)]),
      { type: 'LoversChosen', payload: { aId: 'b', bId: 'c' } },
      { type: 'Killed', payload: { playerId: 'b', cause: 'lynch' } },
    ])
    expect(s.players.find((x) => x.playerId === 'b')!.alive).toBe(false)
    expect(s.players.find((x) => x.playerId === 'c')!.alive).toBe(false)
    expect(s.players.find((x) => x.playerId === 'c')!.deathCause).toBe('heartbreak')
  })
})

describe('Night resolution: protection & healing', () => {
  const base: EngineEvent[] = [
    setup([p('a', ROLES.wolf, 0), p('b', ROLES.seer, 1), p('c', ROLES.witch, 2)]),
    { type: 'NightStarted', payload: {} },
    { type: 'WerewolfVictim', payload: { targetId: 'b' } },
  ]

  it('unprotected victim dies', () => {
    const s = deriveState([...base, { type: 'NightResolved', payload: {} }])
    expect(s.players.find((x) => x.playerId === 'b')!.alive).toBe(false)
  })

  it('healing potion saves the victim', () => {
    const s = deriveState([...base, { type: 'WitchHeal', payload: {} }, { type: 'NightResolved', payload: {} }])
    expect(s.players.find((x) => x.playerId === 'b')!.alive).toBe(true)
    expect(s.witchHealAvailable).toBe(false)
  })

  it('poison potion kills additionally', () => {
    const s = deriveState([
      ...base,
      { type: 'WitchPoison', payload: { targetId: 'a' } },
      { type: 'NightResolved', payload: {} },
    ])
    expect(s.players.find((x) => x.playerId === 'a')!.deathCause).toBe('witch-poison')
  })
})

describe('The Elder', () => {
  it('survives the first werewolf bite, dies on the second', () => {
    const events: EngineEvent[] = [
      setup([p('a', ROLES.wolf, 0), p('o', ROLES.elder, 1), p('b', ROLES.seer, 2)]),
      { type: 'NightStarted', payload: {} },
      { type: 'WerewolfVictim', payload: { targetId: 'o' } },
      { type: 'NightResolved', payload: {} },
    ]
    const afterFirst = deriveState(events)
    expect(afterFirst.players.find((x) => x.playerId === 'o')!.alive).toBe(true)

    const afterSecond = deriveState([
      ...events,
      { type: 'NightStarted', payload: {} },
      { type: 'WerewolfVictim', payload: { targetId: 'o' } },
      { type: 'NightResolved', payload: {} },
    ])
    expect(afterSecond.players.find((x) => x.playerId === 'o')!.alive).toBe(false)
  })
})

describe('Hunter', () => {
  it('is marked as must-shoot on death and takes someone with him', () => {
    const pending = deriveState([
      setup([p('a', ROLES.wolf, 0), p('h', ROLES.hunter, 1), p('b', ROLES.seer, 2)]),
      { type: 'Killed', payload: { playerId: 'h', cause: 'lynch' } },
    ])
    expect(pending.pendingHunterId).toBe('h')

    const shot = deriveState([
      setup([p('a', ROLES.wolf, 0), p('h', ROLES.hunter, 1), p('b', ROLES.seer, 2)]),
      { type: 'Killed', payload: { playerId: 'h', cause: 'lynch' } },
      { type: 'HunterShot', payload: { targetId: 'a' } },
    ])
    expect(shot.players.find((x) => x.playerId === 'a')!.alive).toBe(false)
    expect(shot.pendingHunterId).toBeNull()
  })
})

describe('Win evaluation', () => {
  it('village wins when all wolves are dead', () => {
    const s = deriveState([
      setup([p('a', ROLES.wolf, 0), p('b', ROLES.seer, 1)]),
      { type: 'Killed', payload: { playerId: 'a', cause: 'lynch' } },
    ])
    expect(evaluateWin(s)).toEqual({ condition: 'village', winnerIds: ['b'] })
  })

  it('werewolves win when no village is left alive', () => {
    const s = deriveState([
      setup([p('a', ROLES.wolf, 0), p('b', ROLES.seer, 1)]),
      { type: 'Killed', payload: { playerId: 'b', cause: 'werewolf' } },
    ])
    expect(evaluateWin(s)).toEqual({ condition: 'werewolves', winnerIds: ['a'] })
  })

  it('Pied Piper wins when all living players are charmed', () => {
    const s = deriveState([
      setup([p('f', ROLES.piper, 0), p('a', ROLES.wolf, 1), p('b', ROLES.seer, 2)]),
      { type: 'Charmed', payload: { targetIds: ['a', 'b'] } },
    ])
    expect(evaluateWin(s)).toEqual({ condition: 'pied-piper', winnerIds: ['f'] })
  })

  it('mixed-faction lovers win as the last two', () => {
    const s = deriveState([
      setup([p('a', ROLES.wolf, 0), p('b', ROLES.seer, 1), p('c', ROLES.villager, 2)]),
      { type: 'LoversChosen', payload: { aId: 'a', bId: 'b' } },
      { type: 'Killed', payload: { playerId: 'c', cause: 'lynch' } },
    ])
    expect(evaluateWin(s)).toEqual({ condition: 'lovers', winnerIds: ['a', 'b'] })
  })

  it('ongoing game: no winner', () => {
    const s = deriveState([setup([p('a', ROLES.wolf, 0), p('b', ROLES.seer, 1), p('c', ROLES.villager, 2)])])
    expect(evaluateWin(s)).toBeNull()
  })
})
