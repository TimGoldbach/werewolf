import type { DeathCause, Faction, GameMode, SetRating, WinCondition } from '@werewolf/shared'

export interface GamePlayerRow {
  id: string
  /** null while a live player has not been assigned a role yet */
  roleId: string | null
  roleVersion: string
  finalFaction: Faction | null
  isWinner: boolean
  survived: boolean | null
  diedRound: number | null
  deathCause: DeathCause | null
  player: { id: string; displayName: string }
}

export interface GameListItem {
  id: string
  playedAt: string
  mode: GameMode
  status: string
  winningCondition: WinCondition | null
  rounds: number | null
  notes: string | null
  /** Live house rule: reveal roles after death? null = unknown/not applicable */
  revealRolesOnDeath: boolean | null
  /** Live display: show narration texts to read aloud? */
  showNarration: boolean
  /** Live console: day/night soundscape on? */
  soundEnabled: boolean
  /** The group's feedback on the set (1–5); null = not rated */
  setRating: SetRating | null
  moderator: { id: string; displayName: string } | null
  players: GamePlayerRow[]
}

export interface LivePlayerState {
  playerId: string
  /** null while the person has not been assigned a role yet */
  roleId: string | null
  faction: string
  alive: boolean
  diedRound: number | null
  deathCause: string | null
  loverId: string | null
  /** wild child: chosen role model */
  modelId: string | null
  charmed: boolean
  isCaptain: boolean
  extraLife: boolean
  displayName: string
}

export interface LiveState {
  id: string
  /** Version signal for live polling: changes with every change to the event log (and the sound toggle) */
  version: string
  mode: string
  status: string
  /** House rule: reveal roles after death? null = unknown (legacy data) */
  revealRolesOnDeath: boolean | null
  /** Display: show narration texts to read aloud? */
  showNarration: boolean
  /** Day/night soundscape on? Switchable during the game. */
  soundEnabled: boolean
  round: number
  /** Number of nights started — detects the first day (mayor election) */
  nightsStarted: number
  /** Angel: the game began with a day before the first night */
  openingDayUsed: boolean
  phase: 'setup' | 'night' | 'day' | 'finished'
  players: LivePlayerState[]
  witchHealAvailable: boolean
  witchPoisonAvailable: boolean
  pendingHunterId: string | null
  pendingVictimId: string | null
  pendingExtraVictimId: string | null
  pendingWhiteWolfKillId: string | null
  poisonedId: string | null
  protectedId: string | null
  healedThisNight: boolean
  /** Harlot: person she stays with tonight (untouchable, dies with her) */
  whoreHostId: string | null
  /** Dog: person whose night ability is blocked tonight */
  blockedId: string | null
  /** Night already resolved? Carries the second stage of the closing step. */
  nightResolved: boolean
  /** Goethe: person who must speak in rhymes the following day ("Poet") */
  poetId: string | null
  /** Gull: all heads hit so far (cumulative over the whole game) */
  gullMarkedIds: string[]
  /** Brewer's funeral feast: 'active' = today everyone votes simultaneously on command */
  brewerFeast: 'pending' | 'active' | null
  /** Rusty sword knight devoured: moderator must name the infected werewolf (playerId of the knight) */
  pendingRustyKnightId: string | null
  /** werewolf infected by the rusty blade, who dies on the morning of the day after next */
  rustyInfectedId: string | null
  rustyInfectedRound: number | null
  /** Roles from the deck that have not been assigned to anyone yet */
  unassignedRoles: string[]
  wakeOrder: string[]
  narration: string[]
  proposedWinner: { condition: WinCondition; winnerIds: string[] } | null
}
