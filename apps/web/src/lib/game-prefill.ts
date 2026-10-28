import type { DeathCause, WinCondition } from '@werewolf/shared'
import type { GameListItem } from '@/lib/types'

/** One form row per player (raw, as held in the form). */
export interface Row {
  playerId: string
  roleId: string
  isWinner: boolean
  survived: '' | 'yes' | 'no'
  diedRound: string
  deathCause: '' | DeathCause
}

/** Prefill for the game form — used for "copy" (new game) and "edit". */
export interface GameFormPrefill {
  mode?: 'quick' | 'live'
  rows?: Row[]
  deck?: string[]
  moderatorId?: string
  winningCondition?: WinCondition | ''
  notes?: string
  /** ISO date yyyy-mm-dd */
  playedAt?: string
  showDetails?: boolean
  /** Live house rule of the source game — kept when copying. */
  revealRolesOnDeath?: boolean
  /** Live display setting of the source game — kept when copying. */
  showNarration?: boolean
  /** Soundscape setting of the source game — kept when copying. */
  soundEnabled?: boolean
}

/**
 * yyyy-mm-dd from an ISO timestamp for the <input type="date"> — deliberately via the LOCAL
 * calendar getters (as when recording a game), not toISOString() (UTC). Otherwise the date would
 * shift by a day when editing if 20:00 local time already falls on the next UTC day.
 */
function isoDate(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Builds the form prefill from an existing game.
 * - `forEdit: true`  → carry everything over (roles, outcome, date, moderator, notes) for editing.
 * - `forEdit: false` → "copy": same people + roles, but a new outcome (win/death left empty,
 *   date = today). The mode follows the source (live game → live replay with the same deck).
 */
export function gameToPrefill(game: GameListItem, { forEdit }: { forEdit: boolean }): GameFormPrefill {
  const rows: Row[] = game.players.map((p) => ({
    playerId: p.player.id,
    roleId: p.roleId ?? '',
    isWinner: forEdit ? p.isWinner : false,
    survived: forEdit && p.survived != null ? (p.survived ? 'yes' : 'no') : '',
    diedRound: forEdit && p.diedRound != null ? String(p.diedRound) : '',
    deathCause: forEdit && p.deathCause ? p.deathCause : '',
  }))
  // Deck (multiset of roles) for a live replay of the copy.
  const deck = game.players.map((p) => p.roleId).filter((r): r is string => Boolean(r))
  const showDetails =
    forEdit &&
    game.players.some((p) => p.survived != null || p.diedRound != null || p.deathCause != null)

  return {
    mode: forEdit ? 'quick' : game.mode === 'LIVE' ? 'live' : 'quick',
    rows,
    deck,
    moderatorId: game.moderator?.id ?? '',
    winningCondition: forEdit ? (game.winningCondition ?? '') : '',
    notes: forEdit ? (game.notes ?? '') : '',
    playedAt: forEdit ? isoDate(game.playedAt) : undefined,
    showDetails,
    // Copy of a live game: same house rule. Unknown (legacy data) → off,
    // since the choice is visible right next to it in the form.
    revealRolesOnDeath: game.revealRolesOnDeath ?? false,
    // Same for the display setting — otherwise narration texts that were switched off would
    // silently come back when copying. Legacy data without the column → on (previous behaviour).
    showNarration: game.showNarration ?? true,
    soundEnabled: game.soundEnabled ?? true,
  }
}
