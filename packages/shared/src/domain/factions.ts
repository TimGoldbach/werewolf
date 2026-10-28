/**
 * Faction = the side a role wins with, used for the majority/win evaluation.
 * - village:    wins with the village
 * - werewolves: wins with the pack
 * - solo:       has its own win condition and wins alone (Pied Piper, White Werewolf, Angel)
 * - variable:   can switch sides (Wild Child, Wolf-Hound) — the final faction is decided during the game
 */
export const FACTIONS = ['village', 'werewolves', 'solo', 'variable'] as const
export type Faction = (typeof FACTIONS)[number]

/** Factions that can count as a player's "real" final faction. */
export const RESOLVED_FACTIONS = ['village', 'werewolves', 'solo'] as const
export type ResolvedFaction = (typeof RESOLVED_FACTIONS)[number]

export function isFaction(value: string): value is Faction {
  return (FACTIONS as readonly string[]).includes(value)
}
