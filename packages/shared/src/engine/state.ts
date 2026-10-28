import type { Faction } from '../domain/factions.js'
import type { WinCondition } from '../domain/win-conditions.js'
import type { DeathCause } from '../dto/game.js'

export interface EnginePlayer {
  playerId: string
  /**
   * Assigned role – `null` as long as the player has not yet been assigned a role
   * from the deck (assignment happens the first time the role wakes up).
   */
  roleId: string | null
  /** current faction (can change: wolf hound's choice, wild child, alpha wolf infection) */
  faction: Faction
  alive: boolean
  diedRound: number | null
  deathCause: DeathCause | null
  loverId: string | null
  /** wild child: chosen model — if it dies, the child becomes a werewolf */
  modelId: string | null
  charmed: boolean
  isCaptain: boolean
  /** The Elder: survives the first werewolf bite */
  extraLife: boolean
}

export interface WinResult {
  condition: WinCondition
  winnerIds: string[]
}

export type EnginePhase = 'setup' | 'night' | 'day' | 'finished'

export interface EngineState {
  round: number
  /** Number of nights started (drives round; angel day-first stays round 1) */
  nightsStarted: number
  /** Angel: the game started with a day before the first night */
  openingDayUsed: boolean
  phase: EnginePhase
  players: EnginePlayer[]
  /**
   * Roles from the deck not yet assigned to any player. Drives (together with the
   * already assigned roles of living players) the nightly wake-up order.
   */
  unassignedRoles: string[]
  witchHealAvailable: boolean
  witchPoisonAvailable: boolean
  /** victim chosen by the werewolves this night (before resolution) */
  pendingVictimId: string | null
  /** additional victim (Big Bad Wolf) */
  pendingExtraVictimId: string | null
  /** werewolf the white werewolf kills this night */
  pendingWhiteWolfKillId: string | null
  protectedId: string | null
  healedThisNight: boolean
  poisonedId: string | null
  /** Harlot: player she spends tonight with (makes her untouchable for wolves,
   *  but binds her to that player's fate – if the host dies, she dies too). */
  whoreHostId: string | null
  /** Dog: player who has no ability tonight (is only called for show). */
  blockedId: string | null
  /**
   * Goethe: player who must speak in rhymes the following day ("Poet"). Applies until the
   * start of the next night — Goethe then calls a new player.
   */
  poetId: string | null
  /**
   * Gull: all heads ever hit. Deliberately cumulative over the whole game
   * ("hit heads stay hit") – no reset at night.
   */
  gullMarkedIds: string[]
  /**
   * Brewer (funeral feast): on the day after his death, everyone votes simultaneously on
   * command. 'active' = applies to the current/coming day; 'pending' = he died during
   * the day, the feast is only on the NEXT day (becomes 'active' with the night).
   */
  brewerFeast: 'pending' | 'active' | null
  /** Rusty Sword Knight: infected werewolf who dies on the morning of the day after next */
  rustyInfectedId: string | null
  rustyInfectedRound: number | null
  /**
   * Knight was eaten → the moderator must designate the infected werewolf (next seat
   * clockwise). Holds the playerId of the eaten knight.
   */
  pendingRustyKnightId: string | null
  /** Hunter who still has to shoot (moderator input pending) */
  pendingHunterId: string | null
  /**
   * Has the current night already been resolved? Carries the second stage of the
   * combined step "The night ends → The dawn": before it the resolve button, after it
   * the list of the dead and "start day".
   */
  nightResolved: boolean
  winner: WinResult | null
  narration: string[]
}

export interface SetupPlayer {
  playerId: string
  /**
   * Optional direct assignment. Live games leave the field empty (assignment happens
   * on wake-up); quick entry/tests can pass the role directly.
   */
  roleId?: string | null
}

export type EngineEvent =
  // `roles` = deck of the (initially unassigned) roles; `players[].roleId` may be set for
  // directly bound setups (quick entry/tests/legacy data).
  | { type: 'SetupCompleted'; payload: { players: SetupPlayer[]; roles?: string[] } }
  | { type: 'RoleAssigned'; payload: { playerId: string; roleId: string } }
  | { type: 'LoversChosen'; payload: { aId: string; bId: string } }
  | { type: 'SideChosen'; payload: { playerId: string; side: Faction } }
  | { type: 'CaptainElected'; payload: { playerId: string } }
  | { type: 'NightStarted'; payload: Record<string, never> }
  | { type: 'WerewolfVictim'; payload: { targetId: string | null } }
  | { type: 'BigBadWolfVictim'; payload: { targetId: string | null } }
  | { type: 'Protected'; payload: { targetId: string | null } }
  | { type: 'WitchHeal'; payload: Record<string, never> }
  | { type: 'WitchPoison'; payload: { targetId: string } }
  | { type: 'Charmed'; payload: { targetIds: string[] } }
  | { type: 'Infected'; payload: { targetId: string } }
  | { type: 'WildChildModel'; payload: { childId: string; modelId: string } }
  | { type: 'WhiteWolfKill'; payload: { targetId: string } }
  | { type: 'RustyInfect'; payload: { targetId: string } }
  | { type: 'WhoreVisit'; payload: { targetId: string | null } }
  | { type: 'DogBlock'; payload: { targetId: string | null } }
  | { type: 'PoetChosen'; payload: { targetId: string | null } }
  | { type: 'GullMark'; payload: { targetId: string | null } }
  | { type: 'OpeningDayStarted'; payload: Record<string, never> }
  | { type: 'NightResolved'; payload: Record<string, never> }
  | { type: 'DayStarted'; payload: Record<string, never> }
  | { type: 'Lynched'; payload: { targetId: string | null } }
  | { type: 'HunterShot'; payload: { targetId: string } }
  | { type: 'Killed'; payload: { playerId: string; cause: DeathCause } }
  // Moderator correction of the alive/dead status (without death cascades) — analogous to RoleAssigned.
  | { type: 'DeathSet'; payload: { playerId: string; alive: boolean; cause?: DeathCause } }
  | { type: 'GameEnded'; payload: WinResult }

export type EngineEventType = EngineEvent['type']

/** Runtime list of all event types (for API validation). */
export const ENGINE_EVENT_TYPES = [
  'SetupCompleted',
  'RoleAssigned',
  'LoversChosen',
  'SideChosen',
  'CaptainElected',
  'NightStarted',
  'WerewolfVictim',
  'BigBadWolfVictim',
  'Protected',
  'WitchHeal',
  'WitchPoison',
  'Charmed',
  'Infected',
  'WildChildModel',
  'WhiteWolfKill',
  'RustyInfect',
  'WhoreVisit',
  'DogBlock',
  'PoetChosen',
  'GullMark',
  'OpeningDayStarted',
  'NightResolved',
  'DayStarted',
  'Lynched',
  'HunterShot',
  'Killed',
  'DeathSet',
  'GameEnded',
] as const

export function isEngineEventType(value: string): value is EngineEventType {
  return (ENGINE_EVENT_TYPES as readonly string[]).includes(value)
}
