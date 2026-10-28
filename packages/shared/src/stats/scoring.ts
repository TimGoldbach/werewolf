/**
 * Scoring rules of the leaderboard — deliberately simple enough that every row of the
 * table can be recomputed with pen and paper.
 *
 * Guiding principles:
 *  1. **Only results count, not volume.** The ranking uses the average points
 *     per game: someone who plays twice as often and performs equally well
 *     ends up exactly level. That is why there are no points for taking part
 *     or for streaks — both grow with the number of games.
 *  2. **A win counts for more the fewer people share it.**
 *     The village wins as the majority, the pack as a few, the lovers as a
 *     pair, the solo player entirely alone: village < werewolves < lovers < solo.
 *  3. **A loss earns zero points** — it pulls the average down,
 *     nothing more.
 */

/**
 * Category of a win for awarding points — derived from the game's win label,
 * not from the role card.
 */
export const WIN_CATEGORIES = ['village', 'werewolves', 'lovers', 'solo'] as const
export type WinCategory = (typeof WIN_CATEGORIES)[number]

/**
 * Winner group of a game: the four win categories plus "nobody" for a draw
 * and abort. Unlike `WinCategory` (the view of a winning player) this
 * describes the outcome of the game — every game falls into exactly one group,
 * so a distribution over them always adds up to 100 %.
 */
export const WINNER_GROUPS = [...WIN_CATEGORIES, 'none'] as const
export type WinnerGroup = (typeof WINNER_GROUPS)[number]

export interface ScoringRules {
  /** Win points per category. A loss earns 0. */
  win: Record<WinCategory, number>
}

export const SCORING: ScoringRules = {
  win: { village: 10, werewolves: 18, lovers: 25, solo: 30 },
}

/**
 * Points of a single game — depend only on the outcome.
 *
 * @param category Win category; `null` = the game was lost.
 */
export function scoreGame(category: WinCategory | null, rules: ScoringRules = SCORING): number {
  return category ? rules.win[category] : 0
}
