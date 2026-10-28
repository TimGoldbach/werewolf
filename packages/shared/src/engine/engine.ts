import type { Faction } from '../domain/factions.js'
import type { Archetype } from '../domain/archetypes.js'
import { getRole, nightWakeOrder, ROLE_CATALOG } from '../domain/roles.js'
import { isWinCondition, WIN_CONDITION_DEFS, type WinCondition } from '../domain/win-conditions.js'
import type { DeathCause } from '../dto/game.js'
import type { EngineEvent, EnginePlayer, EngineState, WinResult } from './state.js'

export function initialEngineState(): EngineState {
  return {
    round: 0,
    nightsStarted: 0,
    openingDayUsed: false,
    phase: 'setup',
    players: [],
    unassignedRoles: [],
    witchHealAvailable: true,
    witchPoisonAvailable: true,
    pendingVictimId: null,
    pendingExtraVictimId: null,
    pendingWhiteWolfKillId: null,
    protectedId: null,
    healedThisNight: false,
    poisonedId: null,
    whoreHostId: null,
    blockedId: null,
    poetId: null,
    gullMarkedIds: [],
    brewerFeast: null,
    rustyInfectedId: null,
    rustyInfectedRound: null,
    pendingRustyKnightId: null,
    pendingHunterId: null,
    nightResolved: false,
    winner: null,
    narration: [],
  }
}

function clone(state: EngineState): EngineState {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p })),
    unassignedRoles: [...state.unassignedRoles],
    gullMarkedIds: [...state.gullMarkedIds],
    narration: [...state.narration],
  }
}

/** Sets a player's faction and extra life from their (raw) role. */
function bindRole(p: EnginePlayer, roleId: string): void {
  const role = getRole(roleId)
  p.roleId = roleId
  p.faction = role?.faction ?? 'village'
  p.extraLife = role?.id === 'elder'
}

function find(state: EngineState, playerId: string): EnginePlayer | undefined {
  return state.players.find((p) => p.playerId === playerId)
}

function name(state: EngineState, playerId: string): string {
  return find(state, playerId)?.roleId ?? playerId
}

/** Effective faction for win evaluation (variable → treated as village). */
function eff(p: EnginePlayer): Exclude<Faction, 'variable'> {
  return p.faction === 'variable' ? 'village' : p.faction
}

/** Is at least one werewolf still alive? (for the knight's infection) */
function anyAliveWolf(state: EngineState): boolean {
  return state.players.some((p) => p.alive && p.faction === 'werewolves')
}

/**
 * Kills a player and triggers cascades: the Elder survives the first werewolf
 * bite; lovers die together; the hunter is flagged as "must shoot" (moderator
 * input follows).
 */
function killWithCascade(state: EngineState, playerId: string, cause: DeathCause): void {
  const p = find(state, playerId)
  if (!p || !p.alive) return

  if (cause === 'werewolf' && p.extraLife) {
    p.extraLife = false
    state.narration.push(`${p.playerId}: the Elder survives the first werewolf attack.`)
    return
  }

  p.alive = false
  p.diedRound = state.round
  p.deathCause = cause
  state.narration.push(`${p.playerId} dies (${cause}, round ${state.round}).`)

  // If the wolf infected by the knight dies before the rusty sword strikes (lynch,
  // hunter, witch poison …), the delayed infection lapses — "if he dies earlier,
  // nothing happens". The scheduled knight death (cause 'rusty-sword') is cleaned up
  // separately in NightResolved.
  if (state.rustyInfectedId === p.playerId && cause !== 'rusty-sword') {
    state.rustyInfectedId = null
    state.rustyInfectedRound = null
  }

  // Rusty Sword Knight: eaten by werewolves → the moderator designates the infected
  // wolf (next seat clockwise) via a RustyInfect event. Only meaningful while any
  // werewolf is still alive.
  if (cause === 'werewolf' && p.roleId === 'rusty-sword-knight' && anyAliveWolf(state)) {
    state.pendingRustyKnightId = p.playerId
  }

  // Wild Child: if its model dies, it becomes a werewolf
  for (const child of state.players) {
    if (
      child.alive &&
      child.roleId === 'wild-child' &&
      child.modelId === p.playerId &&
      child.faction !== 'werewolves'
    ) {
      child.faction = 'werewolves'
      state.narration.push('The Wild Child loses its model and becomes a werewolf.')
    }
  }

  // Brewer: funeral feast on the FOLLOWING day. If he dies at night (including via a
  // hunter's shot at dawn — "start day" waits for the shot), that is the dawning day;
  // if he dies during the day, it is the day after the next night.
  if (p.roleId === 'brewer') {
    state.brewerFeast = state.phase === 'day' ? 'pending' : 'active'
    state.narration.push(
      'The Brewer is dead — the village raids his cellar (funeral feast).',
    )
  }

  if (p.roleId === 'hunter' && !state.pendingHunterId) {
    state.pendingHunterId = p.playerId
  }

  if (p.loverId) {
    const lover = find(state, p.loverId)
    if (lover && lover.alive) {
      killWithCascade(state, lover.playerId, 'heartbreak')
    }
  }
}

export function applyEvent(prev: EngineState, event: EngineEvent): EngineState {
  const state = clone(prev)

  switch (event.type) {
    case 'SetupCompleted': {
      // Create players – role either bound directly (quick entry/tests/legacy data)
      // or left empty for now (live: assigned on wake-up).
      state.players = event.payload.players.map((sp) => {
        const role = sp.roleId ? getRole(sp.roleId) : undefined
        return {
          playerId: sp.playerId,
          roleId: sp.roleId ?? null,
          faction: role?.faction ?? 'village',
          alive: true,
          diedRound: null,
          deathCause: null,
          loverId: null,
          modelId: null,
          charmed: false,
          isCaptain: false,
          extraLife: role?.id === 'elder',
        }
      })
      // Deck of roles not yet assigned (live). Directly bound setups already carry
      // the roles on the players → pool stays empty.
      state.unassignedRoles = [...(event.payload.roles ?? [])]
      state.phase = 'setup'
      break
    }
    case 'RoleAssigned': {
      const p = find(state, event.payload.playerId)
      if (p && p.roleId !== event.payload.roleId) {
        // Correction/reassignment: if the player already held a role, its card goes
        // back into the deck before the new one is bound – this keeps the deck
        // multiset consistent (first assignment: roleId is null → nothing returned).
        if (p.roleId) state.unassignedRoles.push(p.roleId)
        bindRole(p, event.payload.roleId)
        // remove exactly one copy of the new role from the deck pool
        const i = state.unassignedRoles.indexOf(event.payload.roleId)
        if (i >= 0) state.unassignedRoles.splice(i, 1)
      }
      break
    }
    case 'LoversChosen': {
      const a = find(state, event.payload.aId)
      const b = find(state, event.payload.bId)
      if (a && b) {
        a.loverId = b.playerId
        b.loverId = a.playerId
        state.narration.push(`Lovers: ${a.playerId} ♥ ${b.playerId}.`)
      }
      break
    }
    case 'SideChosen': {
      const p = find(state, event.payload.playerId)
      if (p) p.faction = event.payload.side
      break
    }
    case 'CaptainElected': {
      state.players.forEach((p) => (p.isCaptain = p.playerId === event.payload.playerId))
      break
    }
    case 'NightStarted': {
      state.nightsStarted += 1
      state.round = state.nightsStarted
      state.phase = 'night'
      state.pendingVictimId = null
      state.pendingExtraVictimId = null
      state.pendingWhiteWolfKillId = null
      state.protectedId = null
      state.healedThisNight = false
      state.poisonedId = null
      // The harlot's visit and the dog's block only apply to the current night.
      state.whoreHostId = null
      state.blockedId = null
      // Goethe's rhyme obligation applied to the past day – Goethe is about to call anew.
      // The gull's hits (gullMarkedIds), in contrast, deliberately persist.
      state.poetId = null
      // Funeral feast: the feast day is over; a brewer who died during the day only
      // invites to the coming day.
      state.brewerFeast = state.brewerFeast === 'pending' ? 'active' : null
      state.nightResolved = false
      break
    }
    case 'WerewolfVictim': {
      state.pendingVictimId = event.payload.targetId
      break
    }
    case 'BigBadWolfVictim': {
      state.pendingExtraVictimId = event.payload.targetId
      break
    }
    case 'Protected': {
      state.protectedId = event.payload.targetId
      break
    }
    case 'WitchHeal': {
      state.healedThisNight = true
      state.witchHealAvailable = false
      break
    }
    case 'WitchPoison': {
      state.poisonedId = event.payload.targetId
      state.witchPoisonAvailable = false
      break
    }
    case 'Charmed': {
      for (const id of event.payload.targetIds) {
        const p = find(state, id)
        if (p) p.charmed = true
      }
      break
    }
    case 'Infected': {
      const p = find(state, event.payload.targetId)
      if (p) p.faction = 'werewolves'
      break
    }
    case 'WildChildModel': {
      const child = find(state, event.payload.childId)
      if (child) child.modelId = event.payload.modelId
      break
    }
    case 'WhiteWolfKill': {
      state.pendingWhiteWolfKillId = event.payload.targetId
      break
    }
    case 'RustyInfect': {
      // The moderator names the werewolf infected by the eaten knight.
      const wolf = find(state, event.payload.targetId)
      const knight = state.pendingRustyKnightId ? find(state, state.pendingRustyKnightId) : undefined
      if (wolf && knight) {
        state.rustyInfectedId = wolf.playerId
        // Tie it to the knight's night of death (not to the time of designation), so the
        // wolf reliably dies on the day after next – even with late input.
        state.rustyInfectedRound = knight.diedRound
        state.pendingRustyKnightId = null
        state.narration.push(
          'The rusty sword infects a werewolf — he dies on the morning of the day after next (unless he dies earlier).',
        )
      }
      break
    }
    case 'WhoreVisit': {
      // The harlot spends the night with a player: untouchable for wolves, but bound to
      // that player's fate (resolved in NightResolved).
      state.whoreHostId = event.payload.targetId
      break
    }
    case 'DogBlock': {
      // The dog blocks a player's night ability (this night only). Pure moderator
      // control: in live mode the player is only called for show.
      state.blockedId = event.payload.targetId
      break
    }
    case 'PoetChosen': {
      // Goethe: the called player must speak in rhymes the following day. Pure
      // moderator note (label "Poet") with no mechanical effect – the penalty for a
      // violation is set by the game master at the table.
      state.poetId = event.payload.targetId
      break
    }
    case 'GullMark': {
      // Gull: hit heads stay hit – the list grows over the game and is never reset.
      // Hitting the same head again changes nothing.
      const id = event.payload.targetId
      if (id && !state.gullMarkedIds.includes(id)) {
        state.gullMarkedIds.push(id)
        state.narration.push(`The Gull hits ${id}.`)
      }
      break
    }
    case 'OpeningDayStarted': {
      state.phase = 'day'
      state.round = 1
      state.openingDayUsed = true
      break
    }
    case 'NightResolved': {
      // 0. Knight's infection: the named wolf dies on the morning of the DAY AFTER NEXT
      //    — i.e. two night resolutions after the knight's death (diedRound + 2). If the
      //    wolf died earlier by other means, the infection has already been cleared.
      if (
        state.rustyInfectedId &&
        state.rustyInfectedRound !== null &&
        state.round - state.rustyInfectedRound >= 2
      ) {
        killWithCascade(state, state.rustyInfectedId, 'rusty-sword')
        state.rustyInfectedId = null
        state.rustyInfectedRound = null
      }
      // Determine pack loss BEFORE this night's deaths (for the Big Bad Wolf)
      const packLost = state.players.some((p) => !p.alive && p.faction === 'werewolves')
      // Harlot: if she spends the night with someone, she is untouchable for the wolves.
      const harlotId =
        state.players.find((p) => p.alive && p.roleId === 'harlot')?.playerId ?? null
      const whoreSafe = state.whoreHostId ? harlotId : null
      // 1. Werewolf victim, unless protected/healed/untouchable (harlot). In the wolf
      //    den the pack eats the harlot herself instead of the chosen victim.
      const denId = whoreInWolfDenId(state)
      const victimId = werewolfVictimId(state)
      if (
        victimId &&
        victimId !== state.protectedId &&
        (victimId === denId || victimId !== whoreSafe) &&
        !state.healedThisNight
      ) {
        killWithCascade(state, victimId, 'werewolf')
      }
      // 2. Second victim (Big Bad Wolf) — only while the pack is intact
      const extraId = state.pendingExtraVictimId
      if (extraId && !packLost && extraId !== state.protectedId && extraId !== whoreSafe) {
        killWithCascade(state, extraId, 'werewolf')
      }
      // 3. White Werewolf kills a werewolf (protection/healing do not apply)
      if (state.pendingWhiteWolfKillId) {
        killWithCascade(state, state.pendingWhiteWolfKillId, 'werewolf')
      }
      // 4. Witch's poison
      if (state.poisonedId) {
        killWithCascade(state, state.poisonedId, 'witch-poison')
      }
      // 5. The harlot dies with her host: if he dies this round (no matter how), she
      //    dies with him. The wolf den is already handled in 1. as a werewolf victim.
      if (state.whoreHostId && harlotId) {
        const host = find(state, state.whoreHostId)
        const whore = find(state, harlotId)
        if (host && whore?.alive && !host.alive && host.diedRound === state.round) {
          killWithCascade(state, harlotId, 'other')
        }
      }
      state.pendingVictimId = null
      state.pendingExtraVictimId = null
      state.pendingWhiteWolfKillId = null
      state.poisonedId = null
      state.protectedId = null
      state.healedThisNight = false
      // An open knight designation lapses once no werewolf is alive.
      if (state.pendingRustyKnightId && !anyAliveWolf(state)) {
        state.pendingRustyKnightId = null
      }
      state.nightResolved = true
      break
    }
    case 'DayStarted': {
      state.phase = 'day'
      break
    }
    case 'Lynched': {
      if (event.payload.targetId) killWithCascade(state, event.payload.targetId, 'lynch')
      break
    }
    case 'HunterShot': {
      state.pendingHunterId = null
      killWithCascade(state, event.payload.targetId, 'hunter')
      break
    }
    case 'Killed': {
      killWithCascade(state, event.payload.playerId, event.payload.cause)
      break
    }
    case 'DeathSet': {
      // Pure moderator correction: sets a player directly to alive or dead – WITHOUT
      // cascades (lovers, hunter …), since the game master corrects each player
      // individually in the overview. Only `alive` counts for statistics/win checks.
      const p = find(state, event.payload.playerId)
      if (p) {
        if (event.payload.alive) {
          p.alive = true
          p.diedRound = null
          p.deathCause = null
          state.narration.push(`${p.playerId} is recorded as alive (correction).`)
        } else {
          if (p.alive) p.diedRound = state.round
          p.alive = false
          p.deathCause = event.payload.cause ?? p.deathCause ?? 'other'
          state.narration.push(`${p.playerId} is recorded as dead (correction).`)
        }
      }
      break
    }
    case 'GameEnded': {
      state.winner = { condition: event.payload.condition, winnerIds: event.payload.winnerIds }
      state.phase = 'finished'
      break
    }
  }

  return state
}

export function deriveState(events: EngineEvent[]): EngineState {
  return events.reduce(applyEvent, initialEngineState())
}

/** Does this player's role carry the given archetype? */
function hasArchetype(p: EnginePlayer, archetype: Archetype): boolean {
  return p.roleId ? (getRole(p.roleId)?.archetypes ?? []).includes(archetype) : false
}

/**
 * Is the player playing for the vampire team? Deliberately checked via the CURRENT
 * faction: the Anemic carries the `vampire-team` archetype, but belongs to the
 * village until bitten — so he must not trigger a vampire win.
 */
function isVampireTeam(p: EnginePlayer): boolean {
  return p.faction === 'solo' && hasArchetype(p, 'vampire-team')
}

/**
 * Solo roles whose win is simply "last one standing": role → win condition. For most,
 * the condition has the same id as the role. According to WIN_CONDITION_DEFS the Stone
 * Golem is also "last one standing", but does not carry the archetype in the catalog;
 * "The Stone" becomes a Stone Golem itself when the golem dies and therefore inherits
 * its condition — otherwise, as a loner, it could never win at all.
 */
const SOLO_SURVIVOR_WIN: Record<string, WinCondition> = (() => {
  const map: Record<string, WinCondition> = { 'stone-golem': 'stone-golem', 'stone': 'stone-golem' }
  for (const r of ROLE_CATALOG) {
    if (r.archetypes.includes('solo-survivor') && isWinCondition(r.id)) map[r.id] = r.id
  }
  return map
})()

/**
 * Archetypes whose living bearers rule out a faction win: they either have to outlive
 * everyone else or need all living players for their own condition.
 *
 * Deliberately an allowlist. The remaining loners (Bella, Frida, Jason, Hermione,
 * Rascal, Groom, Blob, Leech, Werehamster) do not block: their win occurs either
 * independently of how the factions end (through their own death, by guessing, by a
 * bet) or cannot be derived from the state at all. If they blocked, the moderator would
 * never get another suggestion in a game with such a role — which would be worse than
 * a suggestion he can overrule.
 */
const FACTION_WIN_BLOCKERS: Archetype[] = [
  'solo-survivor', // White Werewolf, serial killer, vampire, demon — must outlive everyone
  'vampire-team', // Bat, Ancient Vampire — only with solo faction (not the Anemic)
  'solo-grow-life', // Stone Golem
  'become-role-on-patron-death', // The Stone — becomes the Stone Golem
  'solo-charm', // Pied Piper — needs all living players charmed
  'solo-mark-all', // Gull — needs all living heads hit
]

/**
 * Does this living player prevent a faction win (village/werewolves)? The check used to
 * know only the Pied Piper and the White Werewolf, so e.g. a living serial killer next
 * to the last wolf triggered a werewolf win.
 */
function blocksFactionWin(p: EnginePlayer): boolean {
  // Only true loners block. The Angel, for instance, carries the "village" faction: if
  // he survives the first round, he keeps playing as a villager and wins with the village.
  if (p.faction !== 'solo') return false
  return FACTION_WIN_BLOCKERS.some((a) => hasArchetype(p, a))
}

/**
 * Suggests the game outcome based on the current state. ALL fulfilled conditions are
 * collected and then resolved by `WIN_CONDITION_DEFS[..].priority` (highest first) — so
 * the priority maintained in the catalog decides, not the arbitrary order of the if
 * branches. The moderator confirms/overrides (human in the loop).
 *
 * Not derivable and therefore deliberately not suggested are the solo wins for which the
 * engine keeps no bookkeeping: Bella (vampire bite), Hermione (guessing roles), Rascal
 * (bet), Groom (brides), Blob (absorbed) and Leech (drained). They do, however, block a
 * premature village/werewolf win via `blocksFactionWin`.
 */
export function evaluateWin(state: EngineState): WinResult | null {
  const candidates: WinResult[] = []
  const add = (condition: WinCondition, winnerIds: string[]) => candidates.push({ condition, winnerIds })

  // As long as potentially dangerous roles (wolves/solo) are still unassigned in the
  // deck, the faction situation is unclear: unassigned players provisionally count as
  // "village", although a wolf may still be among them. Then no village win may be
  // suggested (otherwise the village would "win" right at the start).
  const hiddenThreat = state.unassignedRoles.some((r) => {
    const f = getRole(r)?.faction
    return f === 'werewolves' || f === 'solo'
  })

  // ── Wins triggered by one's own death ─────────────────────────────────────
  for (const p of state.players) {
    if (p.alive) continue
    // Angel: eliminated in the first round.
    if (hasArchetype(p, 'solo-die-early') && p.diedRound !== null && p.diedRound <= 1) {
      add('angel', [p.playerId])
    }
    // Frida: eaten by the wolves.
    if (hasArchetype(p, 'solo-be-eaten') && p.deathCause === 'werewolf') add('frida', [p.playerId])
    // Jason: lynched by the village. If he dies as a lover from his partner's lynching,
    // his cause is 'heartbreak' — then, per the catalog, he explicitly does not win.
    if (hasArchetype(p, 'solo-be-lynched') && p.deathCause === 'lynch') add('jason', [p.playerId])
  }

  const alive = state.players.filter((p) => p.alive)
  if (alive.length === 0) add('none', [])

  // ── Collective wins: all other living players are "captured" ─────────────
  const piper = alive.find((p) => p.roleId === 'pied-piper')
  if (piper && alive.every((p) => p.playerId === piper.playerId || p.charmed)) {
    add('pied-piper', [piper.playerId])
  }
  const gull = alive.find((p) => p.roleId === 'gull')
  if (gull && alive.every((p) => p.playerId === gull.playerId || state.gullMarkedIds.includes(p.playerId))) {
    add('gull', [gull.playerId])
  }

  // ── Solo roles that win as the last one standing ──────────────────────────
  if (alive.length > 0 && alive.every(isVampireTeam)) {
    add('vampire', alive.map((p) => p.playerId))
  }
  if (alive.length === 1) {
    const last = alive[0]
    const survivorWin = last.roleId ? SOLO_SURVIVOR_WIN[last.roleId] : undefined
    if (survivorWin) add(survivorWin, [last.playerId])
  }

  const wolvesAlive = alive.filter((p) => eff(p) === 'werewolves')
  const villageAlive = alive.filter((p) => eff(p) === 'village')

  // ── Werehamster: wins as soon as all werewolves are dead ──────────────────
  // There must have been a wolf at some point — otherwise the condition would already be
  // met in the lineup. Only still unassigned WOLF cards hold it back; an unresolved solo
  // card has nothing to do with "all wolves dead".
  const hamsters = alive.filter((p) => hasArchetype(p, 'win-when-wolves-dead'))
  const wolvesEver = state.players.some((p) => eff(p) === 'werewolves')
  const hiddenWolf = state.unassignedRoles.some((r) => getRole(r)?.faction === 'werewolves')
  if (hamsters.length > 0 && wolvesEver && wolvesAlive.length === 0 && !hiddenWolf) {
    add('werehamster', hamsters.map((p) => p.playerId))
  }

  // ── Mixed-faction lovers as the last two ──────────────────────────────────
  if (alive.length === 2 && alive[0].loverId === alive[1].playerId && eff(alive[0]) !== eff(alive[1])) {
    add('lovers', alive.map((p) => p.playerId))
  }

  // ── Faction wins ──────────────────────────────────────────────────────────
  const soloThreatAlive = alive.some((p) => blocksFactionWin(p))
  // The Werehamster cannot be eaten by the wolves: they therefore never reach a state in
  // which only they are alive — a werewolf win next to him is ruled out. He does not
  // block the village win, however; he wins with the fall of the wolves.
  const wolfProofAlive = alive.some((p) => hasArchetype(p, 'unkillable-by-wolves'))
  if (!soloThreatAlive && !wolfProofAlive && wolvesAlive.length > 0 && villageAlive.length === 0) {
    add('werewolves', wolvesAlive.map((p) => p.playerId))
  }
  if (!soloThreatAlive && !hiddenThreat && wolvesAlive.length === 0 && villageAlive.length > 0) {
    add('village', villageAlive.map((p) => p.playerId))
  }

  if (candidates.length === 0) return null
  // Highest priority wins; on a tie the order above is preserved.
  return candidates.reduce((best, c) =>
    WIN_CONDITION_DEFS[c.condition].priority > WIN_CONDITION_DEFS[best.condition].priority ? c : best,
  )
}

/**
 * Roles present in the game and still "alive": roles already assigned to living
 * players plus all still unassigned deck roles (which are by definition still in the
 * game, because their bearer is not yet determined and therefore cannot be dead).
 */
export function presentRoleIds(state: EngineState): string[] {
  const assigned = state.players
    .filter((p) => p.alive && p.roleId)
    .map((p) => p.roleId as string)
  return [...assigned, ...state.unassignedRoles]
}

/**
 * All roles that were ever present in the game – including those whose bearer is
 * already dead. Basis for the nightly "bluff" wake-up calls: a dead role is still
 * called (for show only), so the group cannot infer who is dead from a missing
 * wake-up call. Still unassigned deck roles also count as present (their bearer is
 * not yet determined, so cannot be dead).
 */
export function everPresentRoleIds(state: EngineState): string[] {
  const assigned = state.players.map((p) => p.roleId).filter((r): r is string => !!r)
  return [...new Set([...assigned, ...state.unassignedRoles])]
}

/**
 * Who actually acts in this wake-up call? The werewolf phase is collective: everyone
 * with faction 'werewolves' belongs to the pack — including the dog, a wolf hound who
 * switched to the wolves, infected players and the transformed wild child, all of whom
 * keep their original roleId. For all other roles it is simply the living bearers.
 */
export function livingActorsOfRole(state: EngineState, roleId: string): EnginePlayer[] {
  if (roleId === 'werewolf') {
    return state.players.filter((p) => p.alive && p.faction === 'werewolves')
  }
  return state.players.filter((p) => p.alive && p.roleId === roleId)
}

/**
 * Can the role still act for real this night (living bearer)? If not, it is only
 * woken for show. Still unassigned deck roles count as alive (bearer unknown).
 */
export function roleHasLivingActor(state: EngineState, roleId: string): boolean {
  if (state.unassignedRoles.includes(roleId)) return true
  return livingActorsOfRole(state, roleId).length > 0
}

/** Order in which the roles present in the game are woken at night. */
export function nightWakeSteps(state: EngineState, firstNight: boolean): string[] {
  return nightWakeOrder(presentRoleIds(state), firstNight)
}

/**
 * Harlot in the wolf den: if she spends the night with a werewolf, the wolves eat HER
 * instead of the chosen victim (house rule). Returns her playerId, otherwise null.
 */
export function whoreInWolfDenId(state: EngineState): string | null {
  const host = state.whoreHostId ? find(state, state.whoreHostId) : undefined
  if (host?.faction !== 'werewolves') return null
  return state.players.find((p) => p.alive && p.roleId === 'harlot')?.playerId ?? null
}

/**
 * The pack's victim this night – what the witch gets to see and can save with the
 * healing potion: the harlot in the wolf den, otherwise the chosen victim. After
 * resolution it is booked (the visit itself still applies until the next night).
 */
export function werewolfVictimId(state: EngineState): string | null {
  if (state.nightResolved) return null
  return whoreInWolfDenId(state) ?? state.pendingVictimId
}
