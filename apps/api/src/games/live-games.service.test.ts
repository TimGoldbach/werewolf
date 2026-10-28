import {
  buildDaySteps,
  buildNightSteps,
  buildSetupSteps,
  deriveState,
  stepTexts,
  type EngineEvent,
  type EngineState,
  type ModeratorStep,
} from '@werewolf/shared'
import { ConflictException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import type { AppStateService } from '../app-state/app-state.service'
import type { PrismaService } from '../prisma/prisma.service'
import { LiveGamesService } from './live-games.service'

// The live console casts the LiveState from getState to EngineState and builds its script
// with the helpers from @werewolf/shared (live-console.tsx → buildSteps). If the projection
// lacks a field, the helpers silently compute with `undefined` — that is how the mayor
// election went missing on the first day, and "Der Tag bricht an" in the angel game
// (nightsStarted/openingDayUsed).

const PLAYER_IDS = ['a', 'b', 'c', 'd']
const DECK = ['werewolf', 'seer', 'witch', 'villager']
const ANGEL_DECK = ['werewolf', 'angel', 'seer', 'villager']

const setup = (roles: string[]): EngineEvent => ({
  type: 'SetupCompleted',
  payload: { players: PLAYER_IDS.map((playerId) => ({ playerId })), roles },
})
const angelOpening: EngineEvent[] = [
  setup(ANGEL_DECK),
  { type: 'RoleAssigned', payload: { playerId: 'b', roleId: 'angel' } },
  { type: 'OpeningDayStarted', payload: {} },
]
const nightToDay: EngineEvent[] = [
  { type: 'NightStarted', payload: {} },
  { type: 'NightResolved', payload: {} },
  { type: 'DayStarted', payload: {} },
]

const SCENARIOS: [string, EngineEvent[]][] = [
  ['setup', [setup(DECK)]],
  ['first night', [setup(DECK), { type: 'NightStarted', payload: {} }]],
  ['first day', [setup(DECK), ...nightToDay]],
  ['second day', [setup(DECK), ...nightToDay, ...nightToDay]],
  ['angel opening day', angelOpening],
  ['first day after the angel opening day', [...angelOpening, ...nightToDay]],
]

function serviceFor(events: EngineEvent[], game: { status?: string; soundEnabled?: boolean } = {}): LiveGamesService {
  const row = { status: 'LIVE', soundEnabled: true, ...game }
  const prisma = {
    game: {
      findUnique: async () => ({
        id: 'g1',
        mode: 'LIVE',
        status: row.status,
        revealRolesOnDeath: true,
        showNarration: true,
        soundEnabled: row.soundEnabled,
        players: PLAYER_IDS.map((playerId) => ({ playerId, player: { id: playerId, displayName: playerId } })),
      }),
      update: async ({ data }: { data: { soundEnabled: boolean } }) => Object.assign(row, data),
    },
    gameEvent: {
      findMany: async () => events.map((e, seq) => ({ id: `e${seq}`, seq, type: e.type, payload: e.payload })),
      findFirst: async () => (events.length > 0 ? { id: `e${events.length - 1}` } : null),
    },
  }
  return new LiveGamesService(prisma as unknown as PrismaService, {} as AppStateService)
}

// The assertions below check German step titles.
const TEXTS = stepTexts('de')

/** Same as buildSteps in live-console.tsx. */
function script(state: EngineState): ModeratorStep[] {
  if (state.phase === 'setup') return buildSetupSteps(state, TEXTS)
  if (state.phase === 'night') return buildNightSteps(state, state.round <= 1, TEXTS)
  if (state.phase === 'day') return buildDaySteps(state, TEXTS)
  return []
}

describe('LiveGamesService.getState', () => {
  it.each(SCENARIOS)('%s: projects every EngineState field', async (_, events) => {
    // winner is deliberately excluded: it lives (possibly extended by evaluateWin) in proposedWinner.
    const { winner: _winner, ...engine } = deriveState(events)
    expect(await serviceFor(events).getState('g1')).toMatchObject(engine)
  })

  it.each(SCENARIOS)('%s: the console builds the same script from the projection', async (_, events) => {
    const live = await serviceFor(events).getState('g1')
    expect(script(live as unknown as EngineState)).toEqual(script(deriveState(events)))
  })

  it('first day with mayor election, angel opening day additionally with "Der Tag bricht an"', async () => {
    const titles = async (events: EngineEvent[]) =>
      script((await serviceFor(events).getState('g1')) as unknown as EngineState).map((s) => s.title)
    expect(await titles([setup(DECK), ...nightToDay])).toEqual([
      'Wählt einen Bürgermeister',
      'Die Abstimmung',
      'Die Dämmerung naht',
    ])
    expect(await titles(angelOpening)).toEqual([
      'Wählt einen Bürgermeister',
      'Der Tag bricht an',
      'Die Abstimmung',
      'Die Dämmerung naht',
    ])
  })
})

describe('LiveGamesService sound setting', () => {
  const events = [setup(DECK), { type: 'NightStarted', payload: {} } as EngineEvent]

  it('getState reports the setting and the same version as getVersion', async () => {
    for (const soundEnabled of [true, false]) {
      const service = serviceFor(events, { soundEnabled })
      const state = await service.getState('g1')
      expect(state.soundEnabled).toBe(soundEnabled)
      expect(state.version).toBe((await service.getVersion('g1')).version)
    }
  })

  it('switching the sound changes the version, so other devices reload the state', async () => {
    const on = await serviceFor(events, { soundEnabled: true }).getVersion('g1')
    const off = await serviceFor(events, { soundEnabled: false }).getVersion('g1')
    expect(off.version).not.toBe(on.version)
  })

  it('updateSettings stores the flag and returns the new state', async () => {
    const service = serviceFor(events, { soundEnabled: true })
    const state = await service.updateSettings('g1', { soundEnabled: false })
    expect(state.soundEnabled).toBe(false)
    expect(state.version).toBe((await service.getVersion('g1')).version)
  })

  it('updateSettings rejects a finished game', async () => {
    await expect(
      serviceFor(events, { status: 'FINISHED' }).updateSettings('g1', { soundEnabled: false }),
    ).rejects.toBeInstanceOf(ConflictException)
  })
})
