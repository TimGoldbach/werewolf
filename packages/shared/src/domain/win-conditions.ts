/**
 * Win label of a game ("who won how"). Deliberately separate from the
 * faction, because solo roles and the mixed lovers pair are outcomes of their own.
 */
export const WIN_CONDITIONS = [
  'village',
  'werewolves',
  'lovers',
  'pied-piper',
  'white-werewolf',
  'angel',
  // ── Third parties / loners of the Unified Ruleset ──────────────────────────
  'vampire',
  'serial-killer',
  'demon',
  'blob',
  'leech',
  'stone-golem',
  'groom',
  'rascal',
  'werehamster',
  'bella',
  'frida',
  'jason',
  'hermione',
  'gull',
  'none',
] as const
export type WinCondition = (typeof WIN_CONDITIONS)[number]

export interface WinConditionDef {
  id: WinCondition
  /** Resolution priority: higher = checked first when several conditions are met at once. */
  priority: number
}

export const WIN_CONDITION_DEFS: Record<WinCondition, WinConditionDef> = {
  angel: {
    id: 'angel',
    priority: 100,
  },
  'pied-piper': {
    id: 'pied-piper',
    priority: 90,
  },
  gull: {
    id: 'gull',
    priority: 89,
  },
  'white-werewolf': {
    id: 'white-werewolf',
    priority: 85,
  },
  lovers: {
    id: 'lovers',
    priority: 70,
  },
  // ── Third parties / loners ───────────────────────────────────────────────
  hermione: {
    id: 'hermione',
    priority: 88,
  },
  bella: {
    id: 'bella',
    priority: 87,
  },
  frida: {
    id: 'frida',
    priority: 87,
  },
  jason: {
    id: 'jason',
    priority: 87,
  },
  groom: {
    id: 'groom',
    priority: 84,
  },
  rascal: {
    id: 'rascal',
    priority: 84,
  },
  'serial-killer': {
    id: 'serial-killer',
    priority: 83,
  },
  demon: {
    id: 'demon',
    priority: 83,
  },
  vampire: {
    id: 'vampire',
    priority: 82,
  },
  blob: {
    id: 'blob',
    priority: 82,
  },
  leech: {
    id: 'leech',
    priority: 82,
  },
  'stone-golem': {
    id: 'stone-golem',
    priority: 82,
  },
  werehamster: {
    id: 'werehamster',
    priority: 30,
  },
  werewolves: {
    id: 'werewolves',
    priority: 20,
  },
  village: {
    id: 'village',
    priority: 10,
  },
  none: {
    id: 'none',
    priority: 0,
  },
}

export const WIN_CONDITION_LIST: WinConditionDef[] = Object.values(WIN_CONDITION_DEFS).sort(
  (a, b) => b.priority - a.priority,
)

export function isWinCondition(value: string): value is WinCondition {
  return (WIN_CONDITIONS as readonly string[]).includes(value)
}
