import { describe, expect, it } from 'vitest'
import { deriveState } from './engine.js'
import {
  buildDaySteps,
  buildNightSteps,
  buildSetupSteps,
  isStepActionOpen,
  isStepBluffedByDog,
  isStepPart2Visible,
  isStepRecorded,
  primaryActionTarget,
} from './script.js'
import type { EngineEvent, SetupPlayer } from './state.js'
import { stepTexts } from '../i18n/texts.js'

/** The assertions below check the German narration. */
const DE = stepTexts('de')

function p(playerId: string, roleId: string, _seatIndex?: number): SetupPlayer {
  return { playerId, roleId }
}

const events: EngineEvent[] = [
  {
    type: 'SetupCompleted',
    payload: {
      players: [
        p('a', 'werewolf', 0),
        p('b', 'seer', 1),
        p('c', 'cupid', 2),
        p('d', 'witch', 3),
        p('e', 'bear-tamer', 4),
      ],
    },
  },
  { type: 'NightStarted', payload: {} },
]

describe('buildNightSteps', () => {
  const state = deriveState(events)
  const steps = buildNightSteps(state, true, DE)
  const ids = steps.map((s) => s.roleId ?? s.control.kind)

  it('starts directly with a role without a separate "night falls" panel and ends with ONE closing step', () => {
    // The night is ushered in by the previous step (setup or dusk) →
    // no opening panel of its own; the first step is directly a role.
    expect(steps[0].title).not.toBe('Die Nacht bricht herein')
    expect(steps[0].control.kind).not.toBe('next')
    // Resolve and dawn share one card: one step, two narration blocks.
    const last = steps[steps.length - 1]
    expect(last.control.kind).toBe('resolve')
    expect(last.part2?.stage).toBe('done')
    expect(DE.script.narration.dawn).toContain(last.part2!.lore)
  })

  it('a subsequent night has no "night falls" panel of its own either', () => {
    const later = buildNightSteps(state, false, DE)
    expect(later.some((s) => s.title === 'Die Nacht bricht herein')).toBe(false)
    expect(later[0].control.kind).not.toBe('next')
  })

  it('lists the roles in canonical order (cupid before werewolves before witch) – seer last', () => {
    expect(ids.indexOf('cupid')).toBeLessThan(ids.indexOf('werewolf'))
    expect(ids.indexOf('werewolf')).toBeLessThan(ids.indexOf('witch'))
    // The seer deliberately wakes up last.
    expect(ids.indexOf('witch')).toBeLessThan(ids.indexOf('seer'))
  })

  it('wakes the white werewolf (solo action) BEFORE the pack, alpha wolf/big bad wolf come after', () => {
    const wolfState = deriveState([
      {
        type: 'SetupCompleted',
        payload: {
          players: [
            p('a', 'werewolf', 0),
            p('b', 'white-werewolf', 1),
            p('c', 'accursed-wolf-father', 2),
            p('d', 'big-bad-wolf', 3),
            p('e', 'seer', 4),
          ],
        },
      },
      { type: 'NightStarted', payload: {} },
    ])
    const wolfIds = buildNightSteps(wolfState, true, DE).map((s) => s.roleId ?? s.control.kind)
    expect(wolfIds.indexOf('white-werewolf')).toBeLessThan(wolfIds.indexOf('werewolf'))
    expect(wolfIds.indexOf('werewolf')).toBeLessThan(wolfIds.indexOf('accursed-wolf-father'))
    expect(wolfIds.indexOf('accursed-wolf-father')).toBeLessThan(wolfIds.indexOf('big-bad-wolf'))
  })

  it('still wakes a dead night role (seer) – but only for show (no action control)', () => {
    const base = deriveState([
      {
        type: 'SetupCompleted',
        payload: { players: [p('a', 'werewolf', 0), p('b', 'seer', 1), p('c', 'witch', 2)] },
      },
      { type: 'NightStarted', payload: {} },
    ])
    // The seer (b) has fallen.
    const state = {
      ...base,
      players: base.players.map((pl) => (pl.playerId === 'b' ? { ...pl, alive: false } : pl)),
    }
    const steps = buildNightSteps(state, false, DE)
    const seer = steps.find((s) => s.roleId === 'seer')
    // She is called anyway so the group does not notice her death …
    expect(seer).toBeDefined()
    // … but without a real action (bluff: just advancing + moderator hint).
    expect(seer!.control.kind).toBe('next')
    expect(seer!.instruction).toMatch(/Schein/)
    // Living roles keep their real control.
    const witch = steps.find((s) => s.roleId === 'witch')!
    expect(witch.control.kind).not.toBe('next')
  })

  it('keeps the werewolf phase real while another wolf type is alive (collective bluff protection)', () => {
    const base = deriveState([
      {
        type: 'SetupCompleted',
        payload: { players: [p('a', 'werewolf', 0), p('u', 'accursed-wolf-father', 1), p('s', 'seer', 2)] },
      },
      { type: 'NightStarted', payload: {} },
    ])
    // The plain werewolf (a) is dead, the alpha wolf (u) is still alive → the pack keeps hunting.
    const state = {
      ...base,
      players: base.players.map((pl) => (pl.playerId === 'a' ? { ...pl, alive: false } : pl)),
    }
    const pack = buildNightSteps(state, false, DE).find((s) => s.roleId === 'werewolf')!
    expect(pack.control.kind).toBe('victim')
  })

  it('every step has lore and an instruction', () => {
    for (const s of steps) {
      expect(s.lore.length).toBeGreaterThan(0)
      expect(s.instruction.length).toBeGreaterThan(0)
    }
  })
})

describe('buildDaySteps', () => {
  it('adds a manual bear hint to the vote instruction when a bear tamer is present', () => {
    const lynch = buildDaySteps(deriveState(events), DE).find((s) => s.control.kind === 'lynch')!
    // Without a seating order there is no automatic growl any more – only a manual hint to the moderator.
    expect(lynch.instruction).toContain('Bär')
  })

  it('no bear hint without a bear tamer', () => {
    const noBear = deriveState([
      {
        type: 'SetupCompleted',
        payload: { players: [p('a', 'werewolf'), p('b', 'seer')] },
      },
      { type: 'NightStarted', payload: {} },
    ])
    const lynch = buildDaySteps(noBear, DE).find((s) => s.control.kind === 'lynch')!
    expect(lynch.instruction).not.toContain('Bär')
  })

  it('elects the mayor at the start of the FIRST day, then goes straight to the vote', () => {
    // events contains NightStarted → first regular day; no separate "the day breaks" step.
    const steps = buildDaySteps(deriveState(events), DE)
    expect(steps.some((s) => s.title === 'Der Tag bricht an')).toBe(false)
    expect(steps.map((s) => s.control.kind)).toEqual(['captain', 'lynch', 'startNight'])
    expect(steps[0].title).toBe('Wählt einen Bürgermeister')
    expect(steps[0].optional).toBe(true)
  })

  it('from the second day on no mayor is elected any more', () => {
    const day2 = deriveState([
      ...events,
      { type: 'NightResolved', payload: {} },
      { type: 'DayStarted', payload: {} },
      { type: 'NightStarted', payload: {} },
      { type: 'NightResolved', payload: {} },
      { type: 'DayStarted', payload: {} },
    ])
    const steps = buildDaySteps(day2, DE)
    expect(steps.some((s) => s.control.kind === 'captain')).toBe(false)
    expect(steps.map((s) => s.control.kind)).toEqual(['lynch', 'startNight'])
  })

  it('the angel opening day has the mayor election AND day kickoff (it is the first day)', () => {
    const opening = deriveState([
      {
        type: 'SetupCompleted',
        payload: {
          players: [{ playerId: 'a' }, { playerId: 'b' }, { playerId: 'c' }],
          roles: ['werewolf', 'angel', 'seer'],
        },
      },
      { type: 'OpeningDayStarted', payload: {} },
    ])
    const steps = buildDaySteps(opening, DE)
    expect(steps.map((s) => s.control.kind)).toEqual(['captain', 'next', 'lynch', 'startNight'])
    expect(steps.find((s) => s.control.kind === 'next')!.title).toBe('Der Tag bricht an')
  })
})

describe('buildNightSteps from a pure deck (nothing assigned yet)', () => {
  it('wakes the deck roles even though no player has a role', () => {
    const state = deriveState([
      {
        type: 'SetupCompleted',
        payload: {
          players: [{ playerId: 'a' }, { playerId: 'b' }, { playerId: 'c' }],
          roles: ['werewolf', 'seer', 'witch'],
        },
      },
      { type: 'NightStarted', payload: {} },
    ])
    const roleIds = buildNightSteps(state, true, DE)
      .map((s) => s.roleId)
      .filter(Boolean)
    expect(roleIds).toContain('werewolf')
    expect(roleIds).toContain('witch')
    expect(roleIds).toContain('seer')
    // Seer as the last of the role steps.
    expect(roleIds[roleIds.length - 1]).toBe('seer')
  })
})

describe('buildNightSteps – recording silent special roles (first night)', () => {
  const liveSetup = (roles: string[]) =>
    deriveState([
      {
        type: 'SetupCompleted',
        payload: { players: roles.map((_, i) => ({ playerId: `p${i}` })), roles },
      },
      { type: 'NightStarted', payload: {} },
    ])

  it('calls the brewer for recording so the funeral feast takes effect', () => {
    const steps = buildNightSteps(liveSetup(['werewolf', 'seer', 'brewer']), true, DE)
    const brewer = steps.find((s) => s.roleId === 'brewer')
    expect(brewer?.control.kind).toBe('next')
    expect(buildNightSteps(liveSetup(['werewolf', 'seer', 'brewer']), false, DE).some((s) => s.roleId === 'brewer')).toBe(false)
  })

  it('calls silent special roles (hunter, Elder) in the first night only for recording', () => {
    const state = liveSetup(['werewolf', 'seer', 'hunter', 'elder'])
    const steps = buildNightSteps(state, true, DE)
    const hunterStep = steps.find((s) => s.roleId === 'hunter')
    expect(hunterStep).toBeDefined()
    expect(steps.find((s) => s.roleId === 'elder')).toBeDefined()
    // Recording only: no real action.
    expect(hunterStep!.control.kind).toBe('next')
    // Before the waking roles, so the engine knows special roles before resolution.
    const ids = steps.map((s) => s.roleId ?? s.control.kind)
    expect(ids.indexOf('hunter')).toBeLessThan(ids.indexOf('werewolf'))
    expect(ids.indexOf('hunter')).toBeLessThan(ids.indexOf('seer'))
  })

  it('shows the recording steps only in the FIRST night', () => {
    const state = liveSetup(['werewolf', 'seer', 'hunter'])
    expect(buildNightSteps(state, false, DE).some((s) => s.roleId === 'hunter')).toBe(false)
  })

  it('records only dealt silent roles (no step for roles not present)', () => {
    const steps = buildNightSteps(liveSetup(['werewolf', 'seer', 'hunter']), true, DE)
    expect(steps.some((s) => s.roleId === 'hunter')).toBe(true)
    expect(steps.some((s) => s.roleId === 'bear-tamer')).toBe(false)
  })

  it('skips already assigned silent roles (quick entry)', () => {
    const state = deriveState([
      {
        type: 'SetupCompleted',
        payload: { players: [p('a', 'werewolf'), p('b', 'seer'), p('c', 'hunter')] },
      },
      { type: 'NightStarted', payload: {} },
    ])
    expect(buildNightSteps(state, true, DE).some((s) => s.roleId === 'hunter')).toBe(false)
  })
})

describe('buildSetupSteps', () => {
  it('combines the opening story and the first night into ONE step', () => {
    const steps = buildSetupSteps(deriveState(events), DE)
    expect(steps.map((s) => s.id)).toEqual(['setup-start'])
    expect(steps.some((s) => s.control.kind === 'captain')).toBe(false)
    expect(steps[0].control.kind).toBe('startNight')
    // Both narrations are kept and read aloud in one go.
    expect(DE.script.narration.setupIntro).toContain(steps[0].lore)
    expect(steps[0].part2?.stage).toBe('now')
    expect(DE.script.narration.firstNight).toContain(steps[0].part2!.lore)
  })

  it('starts with an angel day instead of the night when an angel is playing', () => {
    const withAngel: EngineEvent[] = [
      {
        type: 'SetupCompleted',
        payload: {
          players: [p('a', 'werewolf', 0), p('b', 'angel', 1), p('c', 'seer', 2)],
        },
      },
    ]
    const steps = buildSetupSteps(deriveState(withAngel), DE)
    expect(steps.map((s) => s.id)).toEqual(['setup-start'])
    expect(steps[0].control.kind).toBe('openingDay')
    // The angel never wakes up → his player must be bound here (assign gate applies via roleId).
    expect(steps[0].roleId).toBe('angel')
  })

  it('detects the angel from the pure deck as well (nobody assigned yet)', () => {
    const liveDeck = deriveState([
      {
        type: 'SetupCompleted',
        payload: {
          players: [{ playerId: 'a' }, { playerId: 'b' }, { playerId: 'c' }],
          roles: ['werewolf', 'angel', 'seer'],
        },
      },
    ])
    const steps = buildSetupSteps(liveDeck, DE)
    expect(steps[0].control.kind).toBe('openingDay')
    expect(steps[0].roleId).toBe('angel')
  })
})

describe('Brewer funeral feast', () => {
  const brewerEvents: EngineEvent[] = [
    {
      type: 'SetupCompleted',
      payload: {
        players: [
          { playerId: 'br', roleId: 'brewer' },
          { playerId: 'a', roleId: 'seer' },
          { playerId: 'w', roleId: 'werewolf' },
        ],
      },
    },
    { type: 'NightStarted', payload: {} },
    { type: 'WerewolfVictim', payload: { targetId: 'br' } },
    { type: 'NightResolved', payload: {} },
    { type: 'DayStarted', payload: {} },
  ]

  it('announces the simultaneous vote on the following day', () => {
    const lynch = buildDaySteps(deriveState(brewerEvents), DE).find((s) => s.control.kind === 'lynch')!
    expect(lynch.title).toContain('Leichenschmaus')
    expect(lynch.instruction).toContain('gleichzeitig')
    expect(DE.script.narration.brewerFeast).toContain(lynch.lore)
  })

  it('normal vote while the brewer is alive', () => {
    const alive = brewerEvents.filter((e) => e.type !== 'WerewolfVictim')
    const lynch = buildDaySteps(deriveState(alive), DE).find((s) => s.control.kind === 'lynch')!
    expect(lynch.title).toBe('Die Abstimmung')
    expect(lynch.instruction).not.toContain('Leichenschmaus')
  })
})

describe('Narration text variations', () => {
  it('picks a text from the matching variation pool for every narration step', () => {
    const state = deriveState(events)
    const night = buildNightSteps(state, false, DE)
    // No night opening panel of its own any more → the night ends with one step
    // that carries resolution and dawn in two narration blocks.
    const last = night[night.length - 1]
    expect(DE.script.narration.nightResolve).toContain(last.lore)
    expect(DE.script.narration.dawn).toContain(last.part2!.lore)

    // First day: mayor election → vote → dusk (no "the day breaks").
    const day = buildDaySteps(deriveState(events), DE)
    expect(DE.script.narration.captain).toContain(day[0].lore)
    expect(DE.script.narration.dayLynch).toContain(day[1].lore)
    expect(DE.script.narration.dusk).toContain(day[2].lore)
  })

  it('is deterministic: the same state yields the same text', () => {
    const a = buildNightSteps(deriveState(events), false, DE)
    const b = buildNightSteps(deriveState(events), false, DE)
    expect(a[0].lore).toBe(b[0].lore)
  })

  it('varies across rounds (not every night identical)', () => {
    const lores = new Set<string>()
    for (let round = 1; round <= 8; round++) {
      const state = { ...deriveState(events), round }
      lores.add(buildNightSteps(state, false, DE)[0].lore)
    }
    // Over several rounds several different opening texts appear.
    expect(lores.size).toBeGreaterThan(1)
  })

  it('every setup step has a non-empty narration', () => {
    const steps = buildSetupSteps(deriveState(events), DE)
    for (const s of steps) expect(s.lore.length).toBeGreaterThan(0)
  })

  it('role steps carry several lore variants, the displayed one is among them', () => {
    const steps = buildNightSteps(deriveState(events), true, DE)
    const witch = steps.find((s) => s.roleId === 'witch')!
    expect(witch.loreVariants).toBeDefined()
    expect(witch.loreVariants!.length).toBeGreaterThan(1)
    expect(witch.loreVariants).toContain(witch.lore)
  })

  it('role lore varies across rounds', () => {
    const lores = new Set<string>()
    for (let round = 1; round <= 8; round++) {
      const state = { ...deriveState(events), round }
      const wolf = buildNightSteps(state, false, DE).find((s) => s.roleId === 'werewolf')!
      lores.add(wolf.lore)
    }
    expect(lores.size).toBeGreaterThan(1)
  })

  it('every displayed lore variant comes from the step\'s loreVariants pool', () => {
    const steps = buildNightSteps(deriveState(events), true, DE)
    for (const s of steps) {
      if (s.loreVariants) expect(s.loreVariants).toContain(s.lore)
    }
  })
})

describe('Goethe and the Gull choose a player', () => {
  const state = deriveState([
    {
      type: 'SetupCompleted',
      payload: {
        players: [
          p('a', 'werewolf', 0),
          p('g', 'goethe', 1),
          p('m', 'gull', 2),
          p('s', 'seer', 3),
        ],
      },
    },
    { type: 'NightStarted', payload: {} },
  ])
  const steps = buildNightSteps(state, true, DE)

  it('Goethe gets a selection control instead of just advancing', () => {
    const goethe = steps.find((s) => s.roleId === 'goethe')!
    expect(goethe.control.kind).toBe('poet')
    expect(goethe.instruction).toMatch(/Reim/)
  })

  it('the Gull gets a selection control instead of just advancing', () => {
    const gullStep = steps.find((s) => s.roleId === 'gull')!
    expect(gullStep.control.kind).toBe('gullMark')
  })

  it('with a dead bearer it stays a bluff wake-up call (no selection control)', () => {
    const dead = {
      ...state,
      players: state.players.map((pl) => (pl.playerId === 'm' ? { ...pl, alive: false } : pl)),
    }
    const gullStep = buildNightSteps(dead, false, DE).find((s) => s.roleId === 'gull')!
    expect(gullStep.control.kind).toBe('next')
  })
})

describe('isStepRecorded – where does the next click go?', () => {
  const base: EngineEvent[] = [
    {
      type: 'SetupCompleted',
      payload: {
        players: [
          p('a', 'werewolf', 0),
          p('c', 'cupid', 1),
          p('h', 'witch', 2),
          p('s', 'seer', 3),
        ],
      },
    },
    { type: 'NightStarted', payload: {} },
  ]
  const stepOf = (events: EngineEvent[], kind: string) => {
    const state = deriveState(events)
    const step = buildNightSteps(state, true, DE).find((x) => x.control.kind === kind)!
    return { state, step }
  }

  it('Cupid: open before the choice, recorded afterwards — exactly the case the user complained about', () => {
    const before = stepOf(base, 'lovers')
    expect(isStepRecorded(before.step, before.state)).toBe(false)

    const after = stepOf([...base, { type: 'LoversChosen', payload: { aId: 'a', bId: 's' } }], 'lovers')
    expect(isStepRecorded(after.step, after.state)).toBe(true)
  })

  it('Werewolves: recorded as soon as a victim is chosen', () => {
    const before = stepOf(base, 'victim')
    expect(isStepRecorded(before.step, before.state)).toBe(false)

    const after = stepOf([...base, { type: 'WerewolfVictim', payload: { targetId: 's' } }], 'victim')
    expect(isStepRecorded(after.step, after.state)).toBe(true)
  })

  it('Witch: a single potion is enough', () => {
    const before = stepOf(base, 'witch')
    expect(isStepRecorded(before.step, before.state)).toBe(false)

    const healed = stepOf(
      [...base, { type: 'WerewolfVictim', payload: { targetId: 's' } }, { type: 'WitchHeal', payload: {} }],
      'witch',
    )
    expect(isStepRecorded(healed.step, healed.state)).toBe(true)

    const poisoned = stepOf([...base, { type: 'WitchPoison', payload: { targetId: 's' } }], 'witch')
    expect(isStepRecorded(poisoned.step, poisoned.state)).toBe(true)
  })

  it('read-aloud-only steps always count as recorded', () => {
    const state = deriveState(base)
    for (const step of buildNightSteps(state, true, DE)) {
      if (step.control.kind === 'next') expect(isStepRecorded(step, state)).toBe(true)
    }
  })

  it('night-local entries fall back to "open" with the new night', () => {
    const nextNight: EngineEvent[] = [
      ...base,
      { type: 'WerewolfVictim', payload: { targetId: 's' } },
      { type: 'NightResolved', payload: {} },
      { type: 'DayStarted', payload: {} },
      { type: 'NightStarted', payload: {} },
    ]
    const { state, step } = stepOf(nextNight, 'victim')
    expect(isStepRecorded(step, state)).toBe(false)
  })
})

describe('primaryActionTarget – where does the purple button sit?', () => {
  // Deck with exactly the roles from the user's report.
  const players = [
    p('w', 'werewolf', 0),
    p('c', 'cupid', 1),
    p('h', 'witch', 2),
    p('s', 'seer', 3),
    p('v', 'villager', 4),
  ]
  const night = (extra: EngineEvent[] = []) => {
    const state = deriveState([
      { type: 'SetupCompleted', payload: { players } },
      { type: 'NightStarted', payload: {} },
      ...extra,
    ])
    return { state, steps: buildNightSteps(state, true, DE) }
  }
  const stepFor = (kind: string, extra: EngineEvent[] = []) => {
    const { state, steps } = night(extra)
    return { state, step: steps.find((x) => x.control.kind === kind)! }
  }

  it('Cupid: card before setting, "next" afterwards', () => {
    const before = stepFor('lovers')
    expect(primaryActionTarget(before.step, before.state)).toBe('card')

    const after = stepFor('lovers', [{ type: 'LoversChosen', payload: { aId: 'w', bId: 's' } }])
    expect(primaryActionTarget(after.step, after.state)).toBe('next')
  })

  it('Werewolves: card before the victim choice, "next" afterwards', () => {
    const before = stepFor('victim')
    expect(primaryActionTarget(before.step, before.state)).toBe('card')

    const after = stepFor('victim', [{ type: 'WerewolfVictim', payload: { targetId: 's' } }])
    expect(primaryActionTarget(after.step, after.state)).toBe('next')
  })

  it('Witch: "next" from the start — she may do nothing', () => {
    const { state, step } = stepFor('witch')
    expect(step.optional).toBe(true)
    expect(primaryActionTarget(step, state)).toBe('next')
  })

  it('Seer: card until someone has been checked, then "next"', () => {
    const { state, step } = stepFor('reveal')
    // The check triggers no event — the console reports it via actedLocally.
    expect(primaryActionTarget(step, state, false)).toBe('card')
    expect(primaryActionTarget(step, state, true)).toBe('next')
  })

  it('a pending role assignment is always mandatory — even in an optional step', () => {
    const deck = deriveState([
      {
        type: 'SetupCompleted',
        payload: {
          players: [{ playerId: 'a' }, { playerId: 'b' }, { playerId: 'c' }],
          roles: ['werewolf', 'witch', 'seer'],
        },
      },
      { type: 'NightStarted', payload: {} },
    ])
    const witch = buildNightSteps(deck, true, DE).find((x) => x.control.kind === 'witch')!
    expect(witch.optional).toBe(true)
    expect(primaryActionTarget(witch, deck)).toBe('card')
  })

  it('read-aloud-only steps send the button straight to the bottom', () => {
    const { state, steps } = night()
    for (const step of steps) {
      if (step.control.kind === 'next' && !step.roleId) {
        expect(primaryActionTarget(step, state)).toBe('next')
      }
    }
  })

  it('role blocked by the dog: nothing to do, "next" is the action', () => {
    const withDog = deriveState([
      {
        type: 'SetupCompleted',
        payload: { players: [p('d', 'dog', 0), p('s', 'seer', 1), p('w', 'werewolf', 2)] },
      },
      { type: 'NightStarted', payload: {} },
      { type: 'DogBlock', payload: { targetId: 's' } },
    ])
    const seer = buildNightSteps(withDog, false, DE).find((x) => x.roleId === 'seer')!
    expect(primaryActionTarget(seer, withDog)).toBe('next')
  })

  it('Setup: card until the night is started', () => {
    const state = deriveState([{ type: 'SetupCompleted', payload: { players } }])
    const [start] = buildSetupSteps(state, DE)
    expect(primaryActionTarget(start, state)).toBe('card')
  })
})

describe('combined steps', () => {
  const players = [p('w', 'werewolf', 0), p('s', 'seer', 1), p('v', 'villager', 2)]

  it('Setup: one step, both narrations visible immediately', () => {
    const state = deriveState([{ type: 'SetupCompleted', payload: { players } }])
    const [start] = buildSetupSteps(state, DE)
    expect(isStepPart2Visible(start, state)).toBe(true)
  })

  it('Night closing: the second block only appears after resolving', () => {
    const before = deriveState([
      { type: 'SetupCompleted', payload: { players } },
      { type: 'NightStarted', payload: {} },
    ])
    const stepBefore = buildNightSteps(before, true, DE).find((x) => x.control.kind === 'resolve')!
    expect(isStepPart2Visible(stepBefore, before)).toBe(false)

    const after = deriveState([
      { type: 'SetupCompleted', payload: { players } },
      { type: 'NightStarted', payload: {} },
      { type: 'NightResolved', payload: {} },
    ])
    const stepAfter = buildNightSteps(after, true, DE).find((x) => x.control.kind === 'resolve')!
    expect(isStepPart2Visible(stepAfter, after)).toBe(true)
  })

  it('the closing step stays open even after resolving — "start day" is pending', () => {
    const after = deriveState([
      { type: 'SetupCompleted', payload: { players } },
      { type: 'NightStarted', payload: {} },
      { type: 'NightResolved', payload: {} },
    ])
    const step = buildNightSteps(after, true, DE).find((x) => x.control.kind === 'resolve')!
    expect(isStepActionOpen(step, after)).toBe(true)
  })

  it('nightResolved only applies to the current night', () => {
    const nextNight = deriveState([
      { type: 'SetupCompleted', payload: { players } },
      { type: 'NightStarted', payload: {} },
      { type: 'NightResolved', payload: {} },
      { type: 'DayStarted', payload: {} },
      { type: 'NightStarted', payload: {} },
    ])
    expect(nextNight.nightResolved).toBe(false)
    const step = buildNightSteps(nextNight, false, DE).find((x) => x.control.kind === 'resolve')!
    expect(isStepPart2Visible(step, nextNight)).toBe(false)
  })
})

describe('Guarantees the console relies on', () => {
  const players = [p('w', 'werewolf', 0), p('s', 'seer', 1), p('v', 'villager', 2)]
  const base: EngineEvent[] = [{ type: 'SetupCompleted', payload: { players } }]

  it('self-advancing steps are always at the end of their phase', () => {
    // The console hides "next" for these steps. If one of them were in the middle,
    // the phase could no longer be left without its own button.
    const selfAdvancing = ['resolve', 'startNight', 'openingDay']
    const night = deriveState([...base, { type: 'NightStarted', payload: {} }])
    const day = deriveState([
      ...base,
      { type: 'NightStarted', payload: {} },
      { type: 'NightResolved', payload: {} },
      { type: 'DayStarted', payload: {} },
    ])
    const lists = [
      buildSetupSteps(deriveState(base), DE),
      buildNightSteps(night, true, DE),
      buildNightSteps(night, false, DE),
      buildDaySteps(day, DE),
    ]
    for (const steps of lists) {
      steps.forEach((step, i) => {
        if (selfAdvancing.includes(step.control.kind)) {
          expect(i, `${step.title} is not the last step`).toBe(steps.length - 1)
        }
      })
    }
  })

  it('the dog does not silence the werewolf phase when he blocks the card bearer', () => {
    // The dog is a wolf himself – the pack keeps hunting, the victim input must stay.
    const state = deriveState([
      {
        type: 'SetupCompleted',
        payload: {
          players: [p('w', 'werewolf', 0), p('d', 'dog', 1), p('s', 'seer', 2)],
        },
      },
      { type: 'NightStarted', payload: {} },
      { type: 'DogBlock', payload: { targetId: 'w' } },
    ])
    const victim = buildNightSteps(state, false, DE).find((x) => x.control.kind === 'victim')!
    expect(isStepBluffedByDog(victim, state)).toBe(false)
    expect(primaryActionTarget(victim, state)).toBe('card')

    // A genuine single block, on the other hand, stays a bluff.
    const seerBlocked = deriveState([
      {
        type: 'SetupCompleted',
        payload: {
          players: [p('w', 'werewolf', 0), p('d', 'dog', 1), p('s', 'seer', 2)],
        },
      },
      { type: 'NightStarted', payload: {} },
      { type: 'DogBlock', payload: { targetId: 's' } },
    ])
    const seer = buildNightSteps(seerBlocked, false, DE).find((x) => x.roleId === 'seer')!
    expect(isStepBluffedByDog(seer, seerBlocked)).toBe(true)
    expect(primaryActionTarget(seer, seerBlocked)).toBe('next')
  })

  it('a pending role assignment beats the dog bluff', () => {
    // Two copies of the same role: one bound and blocked, one still in the deck.
    // The console then shows the assign gate — the button must be highlighted there.
    const state = deriveState([
      {
        type: 'SetupCompleted',
        payload: {
          players: [{ playerId: 'a' }, { playerId: 'b' }, { playerId: 'c' }, { playerId: 'd' }],
          roles: ['seer', 'seer', 'dog', 'werewolf'],
        },
      },
      { type: 'RoleAssigned', payload: { playerId: 'a', roleId: 'seer' } },
      { type: 'RoleAssigned', payload: { playerId: 'b', roleId: 'dog' } },
      { type: 'NightStarted', payload: {} },
      { type: 'DogBlock', payload: { targetId: 'a' } },
    ])
    const seer = buildNightSteps(state, false, DE).find((x) => x.roleId === 'seer')!
    expect(primaryActionTarget(seer, state)).toBe('card')
  })
})
