import { describe, expect, it } from 'vitest'
import { deriveState, evaluateWin, werewolfVictimId } from './engine.js'
import type { EngineEvent, SetupPlayer } from './state.js'

function p(playerId: string, roleId: string, _seatIndex?: number): SetupPlayer {
  return { playerId, roleId }
}
function setup(players: SetupPlayer[]): EngineEvent {
  return { type: 'SetupCompleted', payload: { players } }
}
function alive(state: ReturnType<typeof deriveState>, id: string) {
  return state.players.find((x) => x.playerId === id)!.alive
}

describe('Big Bad Wolf', () => {
  const players = [
    p('w', 'werewolf', 0),
    p('g', 'big-bad-wolf', 1),
    p('a', 'seer', 2),
    p('b', 'villager', 3),
  ]

  it('claims a second victim as long as the pack is intact', () => {
    const s = deriveState([
      setup(players),
      { type: 'NightStarted', payload: {} },
      { type: 'WerewolfVictim', payload: { targetId: 'a' } },
      { type: 'BigBadWolfVictim', payload: { targetId: 'b' } },
      { type: 'NightResolved', payload: {} },
    ])
    expect(alive(s, 'a')).toBe(false)
    expect(alive(s, 'b')).toBe(false)
  })

  it('no second victim once a wolf has fallen', () => {
    const s = deriveState([
      setup(players),
      { type: 'Killed', payload: { playerId: 'w', cause: 'lynch' } }, // a wolf dies
      { type: 'NightStarted', payload: {} },
      { type: 'WerewolfVictim', payload: { targetId: 'a' } },
      { type: 'BigBadWolfVictim', payload: { targetId: 'b' } },
      { type: 'NightResolved', payload: {} },
    ])
    expect(alive(s, 'a')).toBe(false)
    expect(alive(s, 'b')).toBe(true) // second victim blocked
  })
})

describe('White Werewolf', () => {
  it('kills a werewolf during resolution', () => {
    const s = deriveState([
      setup([p('ww', 'white-werewolf', 0), p('w', 'werewolf', 1), p('a', 'seer', 2)]),
      { type: 'NightStarted', payload: {} },
      { type: 'WhiteWolfKill', payload: { targetId: 'w' } },
      { type: 'NightResolved', payload: {} },
    ])
    expect(alive(s, 'w')).toBe(false)
  })
})

describe('Rusty Sword Knight', () => {
  it('waits for the moderator to name the wolf after the knight dies', () => {
    const afterNight1 = deriveState([
      setup([
        p('r', 'rusty-sword-knight', 0),
        p('w', 'werewolf', 1),
        p('u', 'accursed-wolf-father', 2),
        p('a', 'seer', 3),
      ]),
      { type: 'NightStarted', payload: {} },
      { type: 'WerewolfVictim', payload: { targetId: 'r' } },
      { type: 'NightResolved', payload: {} },
    ])
    expect(alive(afterNight1, 'r')).toBe(false)
    // No wolf infected yet – the moderator has to name him first.
    expect(afterNight1.pendingRustyKnightId).toBe('r')
    expect(afterNight1.rustyInfectedId).toBeNull()
  })

  it('lets the named wolf die only on the morning of the day after next', () => {
    const base: EngineEvent[] = [
      setup([
        p('r', 'rusty-sword-knight', 0),
        p('w', 'werewolf', 1),
        p('u', 'accursed-wolf-father', 2),
        p('a', 'seer', 3),
      ]),
      { type: 'NightStarted', payload: {} },
      { type: 'WerewolfVictim', payload: { targetId: 'r' } },
      { type: 'NightResolved', payload: {} },
      { type: 'RustyInfect', payload: { targetId: 'w' } },
    ]
    const afterInfect = deriveState(base)
    expect(afterInfect.rustyInfectedId).toBe('w')
    expect(afterInfect.pendingRustyKnightId).toBeNull()

    // Night 2 (the "next" day): the wolf is still alive — the blade does not strike yet.
    const afterNight2 = deriveState([
      ...base,
      { type: 'DayStarted', payload: {} },
      { type: 'NightStarted', payload: {} },
      { type: 'NightResolved', payload: {} },
    ])
    expect(alive(afterNight2, 'w')).toBe(true)
    expect(afterNight2.rustyInfectedId).toBe('w')

    // Night 3 (the "day after next"): now the infected wolf dies.
    const afterNight3 = deriveState([
      ...base,
      { type: 'DayStarted', payload: {} },
      { type: 'NightStarted', payload: {} },
      { type: 'NightResolved', payload: {} },
      { type: 'DayStarted', payload: {} },
      { type: 'NightStarted', payload: {} },
      { type: 'NightResolved', payload: {} },
    ])
    const wolf = afterNight3.players.find((x) => x.playerId === 'w')!
    expect(wolf.alive).toBe(false)
    expect(wolf.deathCause).toBe('rusty-sword')
    expect(afterNight3.rustyInfectedId).toBeNull()
  })

  it('lapses if the infected wolf dies earlier (then nothing happens)', () => {
    const s = deriveState([
      setup([
        p('r', 'rusty-sword-knight', 0),
        p('w', 'werewolf', 1),
        p('u', 'accursed-wolf-father', 2),
        p('a', 'seer', 3),
      ]),
      { type: 'NightStarted', payload: {} },
      { type: 'WerewolfVictim', payload: { targetId: 'r' } },
      { type: 'NightResolved', payload: {} },
      { type: 'RustyInfect', payload: { targetId: 'w' } },
      // Day 1: the infected wolf is lynched before the blade strikes.
      { type: 'DayStarted', payload: {} },
      { type: 'Lynched', payload: { targetId: 'w' } },
    ])
    const wolf = s.players.find((x) => x.playerId === 'w')!
    expect(wolf.alive).toBe(false)
    expect(wolf.deathCause).toBe('lynch') // not 'rusty-sword'
    // The pending infection has lapsed …
    expect(s.rustyInfectedId).toBeNull()
    expect(s.rustyInfectedRound).toBeNull()

    // … and two nights later the wolf is not additionally reinterpreted as dying "by the blade".
    const later = deriveState([
      ...[
        setup([
          p('r', 'rusty-sword-knight', 0),
          p('w', 'werewolf', 1),
          p('u', 'accursed-wolf-father', 2),
          p('a', 'seer', 3),
        ]),
        { type: 'NightStarted', payload: {} },
        { type: 'WerewolfVictim', payload: { targetId: 'r' } },
        { type: 'NightResolved', payload: {} },
        { type: 'RustyInfect', payload: { targetId: 'w' } },
        { type: 'DayStarted', payload: {} },
        { type: 'Lynched', payload: { targetId: 'w' } },
        { type: 'NightStarted', payload: {} },
        { type: 'NightResolved', payload: {} },
        { type: 'DayStarted', payload: {} },
        { type: 'NightStarted', payload: {} },
        { type: 'NightResolved', payload: {} },
      ] as EngineEvent[],
    ])
    expect(later.players.find((x) => x.playerId === 'w')!.deathCause).toBe('lynch')
  })
})

describe('The Angel', () => {
  const players = [p('e', 'angel', 0), p('w', 'werewolf', 1), p('a', 'seer', 2)]

  it('wins when he dies in round 1', () => {
    const s = deriveState([
      setup(players),
      { type: 'NightStarted', payload: {} },
      { type: 'WerewolfVictim', payload: { targetId: 'e' } },
      { type: 'NightResolved', payload: {} },
    ])
    expect(evaluateWin(s)).toEqual({ condition: 'angel', winnerIds: ['e'] })
  })

  it('does NOT win any more when he only dies in round 2', () => {
    const s = deriveState([
      setup(players),
      { type: 'NightStarted', payload: {} },
      { type: 'WerewolfVictim', payload: { targetId: 'a' } },
      { type: 'NightResolved', payload: {} },
      { type: 'DayStarted', payload: {} },
      { type: 'NightStarted', payload: {} },
      { type: 'WerewolfVictim', payload: { targetId: 'e' } },
      { type: 'NightResolved', payload: {} },
    ])
    const win = evaluateWin(s)
    expect(win?.condition).not.toBe('angel')
  })

  it('day-first start keeps the first night in round 1', () => {
    const s = deriveState([
      setup(players),
      { type: 'OpeningDayStarted', payload: {} },
      { type: 'NightStarted', payload: {} },
    ])
    expect(s.round).toBe(1)
    expect(s.openingDayUsed).toBe(true)
  })
})

describe('The Wild Child', () => {
  it('becomes a werewolf when its model dies', () => {
    const s = deriveState([
      setup([p('k', 'wild-child', 0), p('m', 'seer', 1), p('w', 'werewolf', 2)]),
      { type: 'WildChildModel', payload: { childId: 'k', modelId: 'm' } },
      { type: 'Killed', payload: { playerId: 'm', cause: 'lynch' } },
    ])
    expect(s.players.find((x) => x.playerId === 'k')!.faction).toBe('werewolves')
  })
})

describe('DeathSet (moderator correction alive/dead)', () => {
  const players = [
    p('a', 'villager', 0),
    p('b', 'seer', 1),
    p('w', 'werewolf', 2),
  ]

  it('records a death retroactively – with cause and current death round', () => {
    const s = deriveState([
      setup(players),
      { type: 'NightStarted', payload: {} },
      { type: 'DeathSet', payload: { playerId: 'a', alive: false, cause: 'other' } },
    ])
    const a = s.players.find((x) => x.playerId === 'a')!
    expect(a.alive).toBe(false)
    expect(a.deathCause).toBe('other')
    expect(a.diedRound).toBe(1)
  })

  it('reverts a death (setting alive clears round/cause)', () => {
    const s = deriveState([
      setup(players),
      { type: 'Killed', payload: { playerId: 'a', cause: 'lynch' } },
      { type: 'DeathSet', payload: { playerId: 'a', alive: true } },
    ])
    const a = s.players.find((x) => x.playerId === 'a')!
    expect(a.alive).toBe(true)
    expect(a.diedRound).toBeNull()
    expect(a.deathCause).toBeNull()
  })

  it('triggers NO lovers cascade (unlike Killed)', () => {
    const s = deriveState([
      setup(players),
      { type: 'LoversChosen', payload: { aId: 'a', bId: 'b' } },
      { type: 'DeathSet', payload: { playerId: 'a', alive: false, cause: 'other' } },
    ])
    expect(s.players.find((x) => x.playerId === 'a')!.alive).toBe(false)
    expect(s.players.find((x) => x.playerId === 'b')!.alive).toBe(true)
  })
})

describe('The Harlot', () => {
  const players = [
    p('h', 'harlot', 0),
    p('g', 'villager', 1),
    p('w', 'werewolf', 2),
    p('s', 'seer', 3),
  ]

  it('is untouchable for werewolves when she spends the night with someone', () => {
    const s = deriveState([
      setup(players),
      { type: 'NightStarted', payload: {} },
      { type: 'WhoreVisit', payload: { targetId: 'g' } },
      { type: 'WerewolfVictim', payload: { targetId: 'h' } },
      { type: 'NightResolved', payload: {} },
    ])
    expect(alive(s, 'h')).toBe(true)
    expect(alive(s, 'g')).toBe(true)
  })

  it('dies when her host dies this night', () => {
    const s = deriveState([
      setup(players),
      { type: 'NightStarted', payload: {} },
      { type: 'WhoreVisit', payload: { targetId: 'g' } },
      { type: 'WerewolfVictim', payload: { targetId: 'g' } },
      { type: 'NightResolved', payload: {} },
    ])
    expect(alive(s, 'g')).toBe(false)
    expect(alive(s, 'h')).toBe(false)
  })

  it('can be killed normally when she is NOT spending the night elsewhere', () => {
    const s = deriveState([
      setup(players),
      { type: 'NightStarted', payload: {} },
      { type: 'WerewolfVictim', payload: { targetId: 'h' } },
      { type: 'NightResolved', payload: {} },
    ])
    expect(alive(s, 'h')).toBe(false)
  })

  it('is eaten INSTEAD of the chosen victim when staying with a werewolf (wolf den)', () => {
    const s = deriveState([
      setup(players),
      { type: 'NightStarted', payload: {} },
      { type: 'WhoreVisit', payload: { targetId: 'w' } }, // w = werewolf
      { type: 'WerewolfVictim', payload: { targetId: 'g' } },
      { type: 'NightResolved', payload: {} },
    ])
    const h = s.players.find((x) => x.playerId === 'h')!
    expect(h.alive).toBe(false)
    expect(h.deathCause).toBe('werewolf')
    expect(alive(s, 'g')).toBe(true)
  })

  it('survives the wolf den when the witch heals her', () => {
    const s = deriveState([
      setup([...players, p('x', 'witch', 4)]),
      { type: 'NightStarted', payload: {} },
      { type: 'WhoreVisit', payload: { targetId: 'w' } },
      { type: 'WerewolfVictim', payload: { targetId: 'g' } },
      { type: 'WitchHeal', payload: {} },
      { type: 'NightResolved', payload: {} },
    ])
    expect(alive(s, 'h')).toBe(true)
    expect(alive(s, 'g')).toBe(true)
  })

  it('is the werewolf victim the witch sees when in the wolf den', () => {
    const events: EngineEvent[] = [
      setup(players),
      { type: 'NightStarted', payload: {} },
      { type: 'WerewolfVictim', payload: { targetId: 'g' } },
    ]
    expect(werewolfVictimId(deriveState(events))).toBe('g')
    expect(werewolfVictimId(deriveState([...events, { type: 'WhoreVisit', payload: { targetId: 's' } }]))).toBe('g')
    expect(werewolfVictimId(deriveState([...events, { type: 'WhoreVisit', payload: { targetId: 'w' } }]))).toBe('h')
    // After resolution the victim is booked – even if the witch saved her.
    const healed = deriveState([
      ...events,
      { type: 'WhoreVisit', payload: { targetId: 'w' } },
      { type: 'WitchHeal', payload: {} },
      { type: 'NightResolved', payload: {} },
    ])
    expect(werewolfVictimId(healed)).toBeNull()
  })
})

describe('The Dog (block)', () => {
  it('remembers the blocked player', () => {
    const s = deriveState([
      setup([p('d', 'dog', 0), p('x', 'seer', 1), p('w', 'werewolf', 2)]),
      { type: 'NightStarted', payload: {} },
      { type: 'DogBlock', payload: { targetId: 'x' } },
    ])
    expect(s.blockedId).toBe('x')
  })

  it('block and harlot visit only apply this night (reset on NightStarted)', () => {
    const s = deriveState([
      setup([p('d', 'dog', 0), p('h', 'harlot', 1), p('w', 'werewolf', 2)]),
      { type: 'NightStarted', payload: {} },
      { type: 'DogBlock', payload: { targetId: 'h' } },
      { type: 'WhoreVisit', payload: { targetId: 'd' } },
      { type: 'NightResolved', payload: {} },
      { type: 'DayStarted', payload: {} },
      { type: 'NightStarted', payload: {} },
    ])
    expect(s.blockedId).toBeNull()
    expect(s.whoreHostId).toBeNull()
  })
})

describe('Goethe (Poet)', () => {
  const players = [p('g', 'goethe', 0), p('x', 'seer', 1), p('w', 'werewolf', 2)]

  it('remembers the player who must speak in rhymes the following day', () => {
    const s = deriveState([
      setup(players),
      { type: 'NightStarted', payload: {} },
      { type: 'PoetChosen', payload: { targetId: 'x' } },
    ])
    expect(s.poetId).toBe('x')
  })

  it('the rhyme obligation lasts through the day but ends with the next night', () => {
    const events: EngineEvent[] = [
      setup(players),
      { type: 'NightStarted', payload: {} },
      { type: 'PoetChosen', payload: { targetId: 'x' } },
      { type: 'NightResolved', payload: {} },
      { type: 'DayStarted', payload: {} },
    ]
    expect(deriveState(events).poetId).toBe('x')
    expect(deriveState([...events, { type: 'NightStarted', payload: {} }]).poetId).toBeNull()
  })
})

describe('The Brewer (funeral feast)', () => {
  const players = [
    p('br', 'brewer', 0),
    p('a', 'seer', 1),
    p('b', 'villager', 2),
    p('w', 'werewolf', 3),
  ]

  it('died at night: feast applies on the dawning day and ends with the next night', () => {
    const night = [
      setup(players),
      { type: 'NightStarted', payload: {} },
      { type: 'WerewolfVictim', payload: { targetId: 'br' } },
      { type: 'NightResolved', payload: {} },
      { type: 'DayStarted', payload: {} },
    ] satisfies EngineEvent[]
    expect(deriveState(night).brewerFeast).toBe('active')
    expect(deriveState([...night, { type: 'NightStarted', payload: {} }]).brewerFeast).toBeNull()
  })

  it('lynched during the day: feast only on the day after the next night', () => {
    const day = [
      setup(players),
      { type: 'NightStarted', payload: {} },
      { type: 'NightResolved', payload: {} },
      { type: 'DayStarted', payload: {} },
      { type: 'Lynched', payload: { targetId: 'br' } },
    ] satisfies EngineEvent[]
    expect(deriveState(day).brewerFeast).toBe('pending')
    const next = [...day, { type: 'NightStarted', payload: {} }] satisfies EngineEvent[]
    expect(deriveState(next).brewerFeast).toBe('active')
    expect(
      deriveState([
        ...next,
        { type: 'NightResolved', payload: {} },
        { type: 'DayStarted', payload: {} },
        { type: 'NightStarted', payload: {} },
      ]).brewerFeast,
    ).toBeNull()
  })

  it('no feast while the brewer is alive', () => {
    const s = deriveState([
      setup(players),
      { type: 'NightStarted', payload: {} },
      { type: 'Lynched', payload: { targetId: 'a' } },
    ])
    expect(s.brewerFeast).toBeNull()
  })
})

describe('The Gull (hits)', () => {
  const players = [
    p('m', 'gull', 0),
    p('x', 'seer', 1),
    p('y', 'villager', 2),
    p('w', 'werewolf', 3),
  ]

  it('collects hit heads across several nights', () => {
    const s = deriveState([
      setup(players),
      { type: 'NightStarted', payload: {} },
      { type: 'GullMark', payload: { targetId: 'x' } },
      { type: 'NightResolved', payload: {} },
      { type: 'DayStarted', payload: {} },
      { type: 'NightStarted', payload: {} },
      { type: 'GullMark', payload: { targetId: 'y' } },
    ])
    expect(s.gullMarkedIds).toEqual(['x', 'y'])
  })

  it('does not count the same head twice', () => {
    const s = deriveState([
      setup(players),
      { type: 'NightStarted', payload: {} },
      { type: 'GullMark', payload: { targetId: 'x' } },
      { type: 'GullMark', payload: { targetId: 'x' } },
    ])
    expect(s.gullMarkedIds).toEqual(['x'])
  })

  it('keeps hits even after the hit player dies', () => {
    const s = deriveState([
      setup(players),
      { type: 'NightStarted', payload: {} },
      { type: 'GullMark', payload: { targetId: 'x' } },
      { type: 'WerewolfVictim', payload: { targetId: 'x' } },
      { type: 'NightResolved', payload: {} },
    ])
    expect(alive(s, 'x')).toBe(false)
    expect(s.gullMarkedIds).toContain('x')
  })
})

describe('evaluateWin – solo roles', () => {
  it('suggests no werewolf win while a serial killer is alive', () => {
    // Only wolf + serial killer left: villageAlive is 0, which used to make the wolves win.
    const s = deriveState([
      setup([p('w', 'werewolf', 0), p('k', 'serial-killer', 1), p('d', 'seer', 2)]),
      { type: 'Killed', payload: { playerId: 'd', cause: 'werewolf' } },
    ])
    expect(evaluateWin(s)).toBeNull()
  })

  it('suggests no village win while a serial killer is alive', () => {
    const s = deriveState([
      setup([p('w', 'werewolf', 0), p('k', 'serial-killer', 1), p('d', 'seer', 2)]),
      { type: 'Killed', payload: { playerId: 'w', cause: 'lynch' } },
    ])
    expect(evaluateWin(s)).toBeNull()
  })

  it('recognizes the serial killer as the last survivor', () => {
    const s = deriveState([
      setup([p('w', 'werewolf', 0), p('k', 'serial-killer', 1), p('d', 'seer', 2)]),
      { type: 'Killed', payload: { playerId: 'w', cause: 'lynch' } },
      { type: 'Killed', payload: { playerId: 'd', cause: 'other' } },
    ])
    expect(evaluateWin(s)).toEqual({ condition: 'serial-killer', winnerIds: ['k'] })
  })

  it('recognizes the demon and the stone golem as last survivors', () => {
    for (const [roleId, condition] of [
      ['demon', 'demon'],
      ['stone-golem', 'stone-golem'],
    ] as const) {
      const s = deriveState([
        setup([p('x', roleId, 0), p('d', 'seer', 1)]),
        { type: 'Killed', payload: { playerId: 'd', cause: 'other' } },
      ])
      expect(evaluateWin(s)).toEqual({ condition, winnerIds: ['x'] })
    }
  })

  it('recognizes the vampire win when only the vampire team is alive', () => {
    const s = deriveState([
      setup([p('v', 'vampire', 0), p('f', 'bat', 1), p('d', 'seer', 2)]),
      { type: 'Killed', payload: { playerId: 'd', cause: 'other' } },
    ])
    expect(evaluateWin(s)).toEqual({ condition: 'vampire', winnerIds: ['v', 'f'] })
  })

  it('does NOT count the Anemic to the vampire team (he is village until bitten)', () => {
    const s = deriveState([
      setup([p('v', 'vampire', 0), p('a', 'anemic', 1)]),
    ])
    // The Anemic is village → neither a vampire win nor a village win (vampire is alive).
    expect(evaluateWin(s)).toBeNull()
  })

  it('recognizes the werehamster as soon as all wolves are dead', () => {
    const s = deriveState([
      setup([p('w', 'werewolf', 0), p('h', 'werehamster', 1), p('d', 'seer', 2)]),
      { type: 'Killed', payload: { playerId: 'w', cause: 'lynch' } },
    ])
    // Priority 30 (werehamster) beats priority 10 (village).
    expect(evaluateWin(s)).toEqual({ condition: 'werehamster', winnerIds: ['h'] })
  })

  it('recognizes Frida when the wolves eat her — but not for another cause of death', () => {
    const eaten = deriveState([
      setup([p('f', 'frida', 0), p('w', 'werewolf', 1), p('d', 'seer', 2)]),
      { type: 'Killed', payload: { playerId: 'f', cause: 'werewolf' } },
    ])
    expect(evaluateWin(eaten)).toEqual({ condition: 'frida', winnerIds: ['f'] })

    const poisoned = deriveState([
      setup([p('f', 'frida', 0), p('w', 'werewolf', 1), p('d', 'seer', 2)]),
      { type: 'Killed', payload: { playerId: 'f', cause: 'witch-poison' } },
    ])
    expect(evaluateWin(poisoned)).toBeNull()
  })

  it('recognizes Jason when lynched — but not when he dies along as a lover', () => {
    const lynched = deriveState([
      setup([p('j', 'jason', 0), p('w', 'werewolf', 1), p('d', 'seer', 2)]),
      { type: 'Lynched', payload: { targetId: 'j' } },
    ])
    expect(evaluateWin(lynched)).toEqual({ condition: 'jason', winnerIds: ['j'] })

    // Partner is lynched → Jason dies of heartbreak, no win.
    const heartbreak = deriveState([
      setup([p('j', 'jason', 0), p('l', 'seer', 1), p('w', 'werewolf', 2)]),
      { type: 'LoversChosen', payload: { aId: 'j', bId: 'l' } },
      { type: 'Lynched', payload: { targetId: 'l' } },
    ])
    const jason = heartbreak.players.find((x) => x.playerId === 'j')!
    expect(jason.deathCause).toBe('heartbreak')
    expect(evaluateWin(heartbreak)?.condition).not.toBe('jason')
  })

  it('recognizes the gull win as soon as all living players are hit', () => {
    const s = deriveState([
      setup([p('m', 'gull', 0), p('a', 'seer', 1), p('b', 'werewolf', 2)]),
      { type: 'NightStarted', payload: {} },
      { type: 'GullMark', payload: { targetId: 'a' } },
      { type: 'GullMark', payload: { targetId: 'b' } },
    ])
    expect(evaluateWin(s)).toEqual({ condition: 'gull', winnerIds: ['m'] })
  })

  it('no gull win while a head is still clean', () => {
    const s = deriveState([
      setup([p('m', 'gull', 0), p('a', 'seer', 1), p('b', 'werewolf', 2)]),
      { type: 'NightStarted', payload: {} },
      { type: 'GullMark', payload: { targetId: 'a' } },
    ])
    expect(evaluateWin(s)).toBeNull()
  })

  it('a surviving angel counts as village and wins with it', () => {
    const s = deriveState([
      setup([p('e', 'angel', 0), p('w', 'werewolf', 1), p('d', 'seer', 2)]),
      { type: 'NightStarted', payload: {} },
      { type: 'NightResolved', payload: {} },
      { type: 'DayStarted', payload: {} },
      { type: 'NightStarted', payload: {} }, // round 2 – the angel has missed his chance
      { type: 'Killed', payload: { playerId: 'w', cause: 'lynch' } },
    ])
    // The Angel has faction "village" (loner category): if he survives round 1, he
    // simply keeps playing as a villager and wins with the village.
    expect(evaluateWin(s)).toEqual({ condition: 'village', winnerIds: ['e', 'd'] })
  })

  it('resolves simultaneously met conditions via the catalog priority', () => {
    // Angel (100) dies in round 1 to the wolves; at the same time no village is left alive (20).
    const s = deriveState([
      setup([p('e', 'angel', 0), p('w', 'werewolf', 1)]),
      { type: 'NightStarted', payload: {} },
      { type: 'WerewolfVictim', payload: { targetId: 'e' } },
      { type: 'NightResolved', payload: {} },
    ])
    expect(evaluateWin(s)).toEqual({ condition: 'angel', winnerIds: ['e'] })
  })
})

describe('evaluateWin – edge cases of solo resolution', () => {
  it('no werehamster win if there was never a wolf in the game', () => {
    const s = deriveState([
      setup([p('h', 'werehamster', 0), p('a', 'seer', 1), p('b', 'villager', 2)]),
    ])
    // Without wolves "all wolves dead" would already be met in the lineup.
    expect(evaluateWin(s)?.condition).not.toBe('werehamster')
  })

  it('no werewolf win next to a living werehamster (wolves cannot eat him)', () => {
    const s = deriveState([
      setup([p('w', 'werewolf', 0), p('h', 'werehamster', 1), p('d', 'seer', 2)]),
      { type: 'Killed', payload: { playerId: 'd', cause: 'werewolf' } },
    ])
    expect(evaluateWin(s)).toBeNull()
  })

  it('"The Stone" wins as the last one via the stone golem condition', () => {
    const s = deriveState([
      setup([p('st', 'stone', 0), p('g', 'stone-golem', 1), p('d', 'seer', 2)]),
      { type: 'Killed', payload: { playerId: 'g', cause: 'lynch' } },
      { type: 'Killed', payload: { playerId: 'd', cause: 'other' } },
    ])
    expect(evaluateWin(s)).toEqual({ condition: 'stone-golem', winnerIds: ['st'] })
  })

  it('non-derivable solo roles do not block the suggestion permanently', () => {
    // Hermione, rascal, groom, blob, leech: their win cannot be derived.
    // If they blocked, the moderator would never get a suggestion again.
    for (const roleId of ['hermione', 'rascal', 'groom', 'blob', 'leech', 'jason', 'bella']) {
      const s = deriveState([
        setup([p('x', roleId, 0), p('d', 'seer', 1), p('w', 'werewolf', 2)]),
        { type: 'Killed', payload: { playerId: 'w', cause: 'lynch' } },
      ])
      expect(evaluateWin(s)?.condition, `${roleId} blocks the village win`).toBe('village')
    }
  })

  it('roles that need all living players or must outlive everyone still block', () => {
    for (const roleId of ['serial-killer', 'demon', 'vampire', 'bat', 'stone-golem', 'stone', 'pied-piper', 'gull']) {
      const s = deriveState([
        setup([p('x', roleId, 0), p('d', 'seer', 1), p('w', 'werewolf', 2)]),
        { type: 'Killed', payload: { playerId: 'w', cause: 'lynch' } },
      ])
      expect(evaluateWin(s), `${roleId} does not block the village win`).toBeNull()
    }
  })
})
