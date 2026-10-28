import type { Faction } from '../domain/factions.js'
import type { RoleCategory } from '../domain/roles.js'
import type { WinCondition } from '../domain/win-conditions.js'
import type { DeathCause, SetRating } from '../dto/game.js'
import type { WinCategory } from '../stats/scoring.js'

export interface RoleText {
  name: string
  /** Alternative names, used by the role search */
  aliases?: readonly string[]
  /** Short hint for the moderator */
  description: string
}

/** Translated texts for the role catalog and all domain labels. */
export interface CatalogTexts {
  /** Keyed by role id; tests check that every catalog role is covered. */
  roles: Record<string, RoleText>
  roleCategories: Record<RoleCategory, string>
  factions: Record<Faction, string>
  deathCauses: Record<DeathCause, string>
  winConditions: Record<WinCondition, { label: string; description: string }>
  winCategories: Record<WinCategory, string>
  /** Why a win category is worth its points (scoring info box) */
  winCategoryRationale: Record<WinCategory, string>
  /** Winner group of a game without winner (draw/abort) */
  noWinner: string
  setRatings: Record<SetRating, string>
}

export const NARRATION_KEYS = [
  'setupIntro',
  'captain',
  'firstNight',
  'nightResolve',
  'dawn',
  'dayOpen',
  'dayLynch',
  'brewerFeast',
  'dusk',
] as const
export type NarrationKey = (typeof NARRATION_KEYS)[number]

/**
 * Translated texts of the moderator script. Variant lists are picked by a stable hash
 * of their length, so every locale must have the same number of variants per list
 * (tests check this); then a game tells the same story in every language.
 */
export interface ScriptTexts {
  narration: Record<NarrationKey, readonly string[]>
  /** Wake-up narration for roles without their own `roleLore` */
  genericWakeLore: readonly string[]
  /** Moderator hint when a dead role is woken for show */
  bluffInstruction: string
  /** Hand-written wake-up steps, keyed by role id */
  roleLore: Record<string, { title: string; lore: readonly string[]; instruction: string }>
  /** Record-only steps of the first night, keyed by role id */
  firstNightRecord: Record<string, { title: string; lore: string; instruction: string }>
  steps: {
    /** Title of a generic wake-up step */
    roleWakes: (roleName: string) => string
    nightResolveTitle: string
    nightResolveInstruction: string
    dawnInstruction: string
    /** Appended to the day's discussion instruction while a bear tamer is in play */
    bearHint: string
    captainTitle: string
    captainInstruction: string
    dayOpenTitle: string
    dayOpenInstruction: string
    lynchTitle: string
    lynchFeastTitle: string
    /** Lead-in of the lynch step on a normal day (no separate day-open step) */
    lynchDiscussion: string
    /** Brewer's funeral feast: everybody votes at once */
    feastHint: string
    lynchInstruction: string
    duskTitle: string
    duskInstruction: string
    setupTitle: string
    setupInstruction: string
    angelLore: string
    angelInstruction: string
    firstNightInstruction: string
  }
}

/** Everything the moderator script needs in one language. */
export interface StepTexts {
  catalog: CatalogTexts
  script: ScriptTexts
}
