import { FIRST_NIGHT_RECORD_ORDER, getRole, nightWakeOrder } from '../domain/roles.js'
import { roleText } from '../i18n/helpers.js'
import type { StepTexts } from '../i18n/types.js'
import {
  everPresentRoleIds,
  livingActorsOfRole,
  presentRoleIds,
  roleHasLivingActor,
} from './engine.js'
import type { EngineState } from './state.js'

/**
 * Control element of a moderator step. Determines which input control the console
 * shows and which engine event it triggers.
 */
export type StepControl =
  | { kind: 'next' } // just advance (purely informational)
  | { kind: 'reveal' } // pick a player → app shows their role (no event)
  | { kind: 'victim' } // WerewolfVictim
  | { kind: 'extraVictim' } // BigBadWolfVictim (optional)
  | { kind: 'infect' } // Infected (optional)
  | { kind: 'lovers' } // LoversChosen
  | { kind: 'charm' } // Charmed (two targets)
  | { kind: 'side' } // SideChosen (wolf hound)
  | { kind: 'witch' } // WitchHeal / WitchPoison
  | { kind: 'captain' } // CaptainElected (optional)
  // Combined: first NightResolved, then (with the list of the dead) DayStarted.
  | { kind: 'resolve' }
  | { kind: 'startNight' } // NightStarted
  | { kind: 'lynch' } // Lynched (optional)
  | { kind: 'model' } // wild child chooses its model
  | { kind: 'whiteWolfKill' } // white werewolf kills a werewolf
  | { kind: 'whoreVisit' } // harlot chooses whom she spends the night with (WhoreVisit)
  | { kind: 'dogBlock' } // dog blocks a player's night ability (DogBlock)
  | { kind: 'poet' } // Goethe designates the next day's "poet" (PoetChosen)
  | { kind: 'gullMark' } // gull hits another head (GullMark)
  | { kind: 'openingDay' } // Angel: start the game with a day

export interface ModeratorStep {
  id: string
  /** associated role (for chip/icon); absent for system steps */
  roleId?: string
  title: string
  /** atmospheric text to read aloud (one randomly chosen variant) */
  lore: string
  /** all available narration variants of this step (for the "new story" re-roll) */
  loreVariants?: readonly string[]
  /** mechanical instruction for the moderator */
  instruction: string
  control: StepControl
  /**
   * Second narration/instruction block of a combined step — so two short panels can
   * share one card without losing any narration.
   * - `stage: 'now'`  → read right below the first block (opening + first night).
   * - `stage: 'done'` → only once the first part is done (resolve → dawn).
   */
  part2?: {
    lore: string
    loreVariants?: readonly string[]
    instruction?: string
    stage: 'now' | 'done'
  }
  /** step may be skipped (role idle / not relevant in this game) */
  optional?: boolean
}

/**
 * Is this step's action already recorded in the state? Purely informational: the console
 * uses it to place the highlighted button where the next click goes (the card while open —
 * afterwards "next"). It never prevents an action.
 *
 * `false` means "not derivable from the state", not "did not happen": charming,
 * infecting and gull hits accumulate over the whole game and cannot be restricted to
 * "this night"; the seer's check triggers no event at all. For these cases the console
 * additionally remembers in which steps it has already acted.
 * The self-advancing steps (startNight, openingDay) do not need this information
 * — they show no "next" anyway.
 */
export function isStepRecorded(step: ModeratorStep, state: EngineState): boolean {
  switch (step.control.kind) {
    case 'next':
      return true // read-aloud only — nothing to record
    case 'resolve':
      // First stage of the combined step; "start day" follows afterwards.
      return state.nightResolved
    case 'victim':
      return state.pendingVictimId !== null
    case 'extraVictim':
      return state.pendingExtraVictimId !== null
    case 'whiteWolfKill':
      return state.pendingWhiteWolfKillId !== null
    case 'whoreVisit':
      return state.whoreHostId !== null
    case 'dogBlock':
      return state.blockedId !== null
    case 'poet':
      return state.poetId !== null
    case 'witch':
      // Also done when both potions are long used up — then there is nothing to do.
      return (
        state.healedThisNight ||
        state.poisonedId !== null ||
        (!state.witchHealAvailable && !state.witchPoisonAvailable)
      )
    case 'lynch':
      // Round-local: cascade deaths (heartbreak, hunter) carry a different cause.
      return state.players.some(
        (p) => !p.alive && p.deathCause === 'lynch' && p.diedRound === state.round,
      )
    case 'lovers':
      return state.players.some((p) => p.loverId !== null)
    case 'captain':
      return state.players.some((p) => p.isCaptain)
    case 'model':
      return state.players.some((p) => p.roleId === 'wild-child' && p.modelId !== null)
    case 'side':
      return state.players.some((p) => p.roleId === 'wolf-hound' && p.faction !== 'variable')
    default:
      return false
  }
}

/** Is this step's role assignment still pending? Then it IS its action. */
export function isRoleAssignmentPending(step: ModeratorStep, state: EngineState): boolean {
  return step.roleId != null && state.unassignedRoles.includes(step.roleId)
}

/**
 * Is this step only called for show because the dog blocks the only living bearer
 * of its role? Then there is nothing to record.
 */
export function isStepBluffedByDog(step: ModeratorStep, state: EngineState): boolean {
  if (state.blockedId == null || step.roleId == null) return false
  // Via livingActorsOfRole, not via the roleId: if the dog blocks the only bearer of
  // the "plain werewolf" card, the pack keeps hunting anyway (he is a wolf himself) —
  // so the victim input must not disappear.
  const holders = livingActorsOfRole(state, step.roleId)
  return holders.length > 0 && holders.every((p) => p.playerId === state.blockedId)
}

/**
 * Is an input still pending in this step? Drives the highlighting of the card.
 *
 * `actedLocally` covers what the state cannot tell: charming, infecting and gull hits
 * accumulate over the whole game, and the seer's check triggers no event at all. The
 * console remembers for this where it has acted in this session.
 */
export function isStepActionOpen(
  step: ModeratorStep,
  state: EngineState,
  actedLocally = false,
): boolean {
  // Same order as in the console: the assign gate is rendered BEFORE the bluff banner,
  // so a pending assignment is mandatory even if the step itself would only be called
  // for show (deck with two copies of the same role).
  if (isRoleAssignmentPending(step, state)) return true
  if (isStepBluffedByDog(step, state)) return false
  if (step.control.kind === 'next') return false
  // Two-stage steps stay open even after the first part: after "resolve night" the
  // "start day" is still pending, so the card must not calm down.
  if (step.part2?.stage === 'done') return true
  return !actedLocally && !isStepRecorded(step, state)
}

/**
 * Is it already the second narration block's turn? `stage: 'now'` always, `stage: 'done'`
 * only once the first part has reached the state (night resolved).
 */
export function isStepPart2Visible(step: ModeratorStep, state: EngineState): boolean {
  if (!step.part2) return false
  return step.part2.stage === 'now' || isStepRecorded(step, state)
}

/**
 * Where does the highlighted (primary) button sit — in the step card or at the bottom
 * on "next"? There is always exactly one, and it sits where things continue.
 *
 * `'card'` only while a mandatory step is open. Optional steps (witch, mayor, vote)
 * can be skipped at any time — there "next" is the main action from the start,
 * otherwise the witch would show two equally highlighted potion buttons. A pending
 * role assignment, on the other hand, is always mandatory, even in a step marked
 * optional.
 */
export function primaryActionTarget(
  step: ModeratorStep,
  state: EngineState,
  actedLocally = false,
): 'card' | 'next' {
  if (!isStepActionOpen(step, state, actedLocally)) return 'next'
  if (step.optional && !isRoleAssignmentPending(step, state)) return 'next'
  return 'card'
}


/**
 * Stable hash (FNV-1a) for a deterministic, but "random"-looking selection.
 * Deliberately deterministic: the steps are built in a client component that is also
 * rendered on the server – Math.random() would differ between server render and
 * client hydration (hydration mismatch).
 */
function hashSeed(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Picks exactly one element from a list of variants. Same seed → same element;
 * different games/rounds yield (practically random) different ones.
 */
function pickVariant(variants: readonly string[], seed: string): string {
  return variants[hashSeed(seed) % variants.length] ?? variants[0]!
}

/** Seed component that is stable per game and identical on server and client. */
function gameSeed(state: EngineState): string {
  return state.players.map((p) => p.playerId).join(',')
}





/** Input control per role with a hand-written moderator step (texts: `ScriptTexts.roleLore`). */
const ROLE_STEPS: Record<string, { control: StepControl; optional?: boolean }> = {
  cupid: { control: { kind: 'lovers' } },
  seer: { control: { kind: 'reveal' } },
  'two-sisters': { control: { kind: 'next' } },
  'wild-child': { control: { kind: 'model' } },
  'wolf-hound': { control: { kind: 'side' } },
  'werewolf': { control: { kind: 'victim' } },
  'white-werewolf': { control: { kind: 'whiteWolfKill' }, optional: true },
  'accursed-wolf-father': { control: { kind: 'infect' }, optional: true },
  'big-bad-wolf': { control: { kind: 'extraVictim' }, optional: true },
  witch: { control: { kind: 'witch' }, optional: true },
  fox: { control: { kind: 'next' }, optional: true },
  'pied-piper': { control: { kind: 'charm' }, optional: true },
  harlot: { control: { kind: 'whoreVisit' } },
  dog: { control: { kind: 'dogBlock' } },
  goethe: { control: { kind: 'poet' } },
  gull: { control: { kind: 'gullMark' } },
}

/** Roles with a hand-written moderator step; every locale has `roleLore` for exactly these. */
export const SCRIPTED_ROLE_IDS: readonly string[] = Object.keys(ROLE_STEPS)

export function buildNightSteps(
  state: EngineState,
  firstNight: boolean,
  texts: StepTexts,
): ModeratorStep[] {
  const seed = gameSeed(state)
  const { narration, steps: t } = texts.script
  const steps: ModeratorStep[] = []

  // No separate "night falls" panel: the preceding step (setup "the first night" or
  // day "dusk approaches") already ushers in the night and says "close your eyes" –
  // the roles wake up right afterwards.

  // First night: briefly "call" silent special roles (hunter, Elder, knight, bear tamer,
  // little girl) solely so the moderator records who holds them. They do not wake up
  // and do not act (control → 'next'); recording goes through the existing assignment
  // gate. Only still unassigned roles are shown – already bound ones (e.g. quick
  // entry) are omitted.
  if (firstNight) {
    for (const roleId of FIRST_NIGHT_RECORD_ORDER) {
      if (!state.unassignedRoles.includes(roleId)) continue
      const rec = texts.script.firstNightRecord[roleId]
      if (!rec) continue
      steps.push({
        id: `night-${state.round}-record-${roleId}`,
        roleId,
        title: rec.title,
        lore: rec.lore,
        instruction: rec.instruction,
        control: { kind: 'next' },
        optional: true,
      })
    }
  }

  // Wake-up order from the deck – including roles whose bearer is already dead
  // (`everPresentRoleIds`), not just the living ones. Dead roles are still called,
  // but only for show: this way the group cannot infer who is still alive from a
  // missing wake-up call. Assignment only happens on wake-up.
  for (const roleId of nightWakeOrder(everPresentRoleIds(state), firstNight)) {
    // The White Werewolf acts (alone) only every second night – even rounds. This is a
    // known rule (no revealing omission), so it may also be skipped when the white
    // werewolf is dead.
    if (roleId === 'white-werewolf' && state.round % 2 !== 0) continue
    // Bluff: if no bearer is alive any more, the role is only apparently woken – same
    // narration to read aloud, but no real action/input (control → 'next').
    const bluff = !roleHasLivingActor(state, roleId)

    const step = ROLE_STEPS[roleId]
    const lore = texts.script.roleLore[roleId]
    if (step && lore) {
      steps.push({
        id: `night-${state.round}-${roleId}`,
        roleId,
        title: lore.title,
        lore: pickVariant(lore.lore, `${seed}|role:${roleId}|${state.round}`),
        loreVariants: lore.lore,
        instruction: bluff ? texts.script.bluffInstruction : lore.instruction,
        control: bluff ? { kind: 'next' } : step.control,
        optional: bluff ? true : step.optional,
      })
      continue
    }

    // Fallback: role without a hand-written step. The moderator performs the action
    // described in the catalog at the table; the app only binds the player (assign
    // gate via roleId) and then moves on. This makes every night-active role of the
    // unified ruleset playable live. With a dead bearer it is likewise only a bluff
    // step (no revealing omission).
    if (!getRole(roleId)) continue
    const role = roleText(texts.catalog, roleId)
    const generic = texts.script.genericWakeLore
    steps.push({
      id: `night-${state.round}-${roleId}`,
      roleId,
      title: t.roleWakes(role.name),
      lore: pickVariant(generic, `${seed}|role:${roleId}|${state.round}`),
      loreVariants: generic,
      instruction: bluff ? texts.script.bluffInstruction : role.description,
      control: { kind: 'next' },
      optional: true,
    })
  }

  // Resolving and dawn share one card: resolving is a pure calculation step without
  // its own announcement — only afterwards is there something to announce. The second
  // narration block therefore only appears once the night is resolved.
  steps.push({
    id: `night-${state.round}-resolve`,
    title: t.nightResolveTitle,
    lore: pickVariant(narration.nightResolve, `${seed}|night-resolve|${state.round}`),
    loreVariants: narration.nightResolve,
    instruction: t.nightResolveInstruction,
    control: { kind: 'resolve' },
    part2: {
      lore: pickVariant(narration.dawn, `${seed}|dawn|${state.round}`),
      loreVariants: narration.dawn,
      instruction: t.dawnInstruction,
      stage: 'done',
    },
  })
  return steps
}

/** Is a bear tamer alive (or still unseen in the deck)? */
function bearInPlay(state: EngineState): boolean {
  return presentRoleIds(state).includes('bear-tamer')
}

export function buildDaySteps(state: EngineState, texts: StepTexts): ModeratorStep[] {
  const seed = gameSeed(state)
  const { narration, steps: t } = texts.script
  // Without a seating order the app can no longer detect automatically whether a wolf
  // sits next to the bear – the moderator decides at the real table (manual hint).
  const bearHint = bearInPlay(state) ? ` ${t.bearHint}` : ''
  // Opening day (angel, before the first night): no night started yet → its own day
  // kickoff. A NORMAL day follows a night whose "dawn" panel has already announced the
  // morning – then the separate "the day breaks" step is omitted.
  const isOpeningDay = state.nightsStarted === 0
  // The mayor is elected at the start of the FIRST day (in daylight) – no longer
  // before the first night. First day = the angel's opening day OR the first regular
  // day after the first night.
  const isFirstDay = state.nightsStarted === 0 || (state.nightsStarted === 1 && !state.openingDayUsed)

  const steps: ModeratorStep[] = []

  if (isFirstDay) {
    steps.push({
      id: `day-${state.round}-captain`,
      title: t.captainTitle,
      lore: pickVariant(narration.captain, `${seed}|captain`),
      loreVariants: narration.captain,
      instruction: t.captainInstruction,
      control: { kind: 'captain' },
      optional: true,
    })
  }

  if (isOpeningDay) {
    steps.push({
      id: `day-${state.round}-open`,
      title: t.dayOpenTitle,
      lore: pickVariant(narration.dayOpen, `${seed}|day-open|${state.round}`),
      loreVariants: narration.dayOpen,
      instruction: `${t.dayOpenInstruction}${bearHint}`,
      control: { kind: 'next' },
    })
  }

  // Brewer's funeral feast: today the vote runs simultaneously on command.
  const feast = state.brewerFeast === 'active'
  const lynchLore = feast ? narration.brewerFeast : narration.dayLynch

  steps.push({
    id: `day-${state.round}-lynch`,
    title: feast ? t.lynchFeastTitle : t.lynchTitle,
    lore: pickVariant(lynchLore, `${seed}|day-lynch|${state.round}`),
    loreVariants: lynchLore,
    // On a normal day (without a separate kickoff) introduce the discussion + bear hint here.
    instruction:
      (isOpeningDay ? '' : `${t.lynchDiscussion}${bearHint} `) +
      (feast ? `${t.feastHint} ` : '') +
      t.lynchInstruction,
    control: { kind: 'lynch' },
    // Explicitly skippable ("Nobody? Then skip.") — so the console may show "next" as the
    // main action from the start; the lynch button is red anyway.
    optional: true,
  })

  steps.push({
    id: `day-${state.round}-tonight`,
    title: t.duskTitle,
    lore: pickVariant(narration.dusk, `${seed}|dusk|${state.round}`),
    loreVariants: narration.dusk,
    instruction: t.duskInstruction,
    control: { kind: 'startNight' },
  })

  return steps
}

/**
 * Setup: ONE step. The opening story and the kickoff (first night or angel day) share
 * one card — both texts are read aloud in one go, and there is nothing to record in
 * between anyway. The mayor is only elected at the start of the first day (see
 * buildDaySteps), no longer before the night.
 */
export function buildSetupSteps(state: EngineState, texts: StepTexts): ModeratorStep[] {
  const seed = gameSeed(state)
  const { narration, steps: t } = texts.script
  const hasAngel = presentRoleIds(state).includes('angel')
  const intro = pickVariant(narration.setupIntro, `${seed}|setup-intro`)

  if (hasAngel) {
    return [
      {
        id: 'setup-start',
        // roleId marks the step for the angel's assignment: the Angel never wakes up,
        // but decides the game flow (day first) and a round-1 instant win – therefore
        // his player MUST be bound here (before the opening day).
        roleId: 'angel',
        title: t.setupTitle,
        lore: intro,
        loreVariants: narration.setupIntro,
        instruction: t.setupInstruction,
        control: { kind: 'openingDay' },
        part2: {
          lore: t.angelLore,
          instruction: t.angelInstruction,
          stage: 'now',
        },
      },
    ]
  }

  return [
    {
      id: 'setup-start',
      title: t.setupTitle,
      lore: intro,
      loreVariants: narration.setupIntro,
      instruction: t.setupInstruction,
      control: { kind: 'startNight' },
      part2: {
        lore: pickVariant(narration.firstNight, `${seed}|first-night`),
        loreVariants: narration.firstNight,
        instruction: t.firstNightInstruction,
        stage: 'now',
      },
    },
  ]
}
