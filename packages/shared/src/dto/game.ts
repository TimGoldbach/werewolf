import { z } from 'zod'
import { FACTIONS } from '../domain/factions.js'
import { WIN_CONDITIONS } from '../domain/win-conditions.js'

export const GAME_MODES = ['QUICK', 'LIVE'] as const
export type GameMode = (typeof GAME_MODES)[number]

export const GAME_STATUSES = ['SETUP', 'LIVE', 'FINISHED', 'ABORTED'] as const
export type GameStatus = (typeof GAME_STATUSES)[number]

export const DEATH_CAUSES = [
  'werewolf',
  'witch-poison',
  'lynch',
  'hunter',
  'heartbreak',
  'rusty-sword',
  'other',
] as const
export type DeathCause = (typeof DEATH_CAUSES)[number]

/**
 * Feedback on a game's role set: how did the group like the role combination? 1 (flop) to
 * 5 (top). Weights the set suggestions for the next game with the same player count.
 */
export const SET_RATINGS = [1, 2, 3, 4, 5] as const
export type SetRating = (typeof SET_RATINGS)[number]

export function isSetRating(value: unknown): value is SetRating {
  return typeof value === 'number' && (SET_RATINGS as readonly number[]).includes(value)
}

/** Set the set feedback of a finished game; `null` withdraws the rating. */
export const setGameFeedbackSchema = z.object({
  setRating: z.number().int().min(1).max(5).nullable(),
})
export type SetGameFeedbackInput = z.infer<typeof setGameFeedbackSchema>

/** One role/result row per participant (moderator NOT included). */
export const gamePlayerInputSchema = z.object({
  playerId: z.string().min(1),
  roleId: z.string().min(1),
  finalFaction: z.enum(FACTIONS).nullable().optional(),
  isWinner: z.boolean(),
  survived: z.boolean().nullable().optional(),
  diedRound: z.number().int().min(0).nullable().optional(),
  deathCause: z.enum(DEATH_CAUSES).nullable().optional(),
})
export type GamePlayerInput = z.infer<typeof gamePlayerInputSchema>

/** Quick capture of a game (played offline): roles + outcome. */
export const createQuickGameSchema = z
  .object({
    playedAt: z.string().datetime().optional(),
    moderatorId: z.string().nullable().optional(),
    notes: z.string().max(2000).optional(),
    roleSetVersion: z.string().optional(),
    winningCondition: z.enum(WIN_CONDITIONS),
    players: z.array(gamePlayerInputSchema).min(3, 'At least 3 players'),
  })
  .superRefine((data, ctx) => {
    const playerIds = new Set<string>()
    data.players.forEach((p, i) => {
      if (playerIds.has(p.playerId)) {
        ctx.addIssue({ code: 'custom', message: 'Player appears twice in the game', path: ['players', i, 'playerId'] })
      }
      playerIds.add(p.playerId)
    })
    if (data.moderatorId && playerIds.has(data.moderatorId)) {
      ctx.addIssue({ code: 'custom', message: 'Moderator must not take part as a player', path: ['moderatorId'] })
    }
  })
export type CreateQuickGameInput = z.infer<typeof createQuickGameSchema>

/**
 * Setup for a live-moderated game: only the players + the role deck.
 * Who holds which role is NOT fixed up front — the assignment happens during
 * the game when a role wakes up for the first time.
 */
export const createLiveGameSchema = z
  .object({
    playedAt: z.string().datetime().optional(),
    moderatorId: z.string().nullable().optional(),
    notes: z.string().max(2000).optional(),
    roleSetVersion: z.string().optional(),
    players: z
      .array(z.object({ playerId: z.string().min(1) }))
      .min(3, 'At least 3 players'),
    /** The deck: exactly one (still unassigned) role for each player. */
    roles: z.array(z.string().min(1)).min(3, 'At least 3 roles'),
    /**
     * House rule of this game: is a person's role revealed once they die?
     * Deliberately REQUIRED and without a default — the rule changes the game
     * significantly, and a silent default would write it into the statistics as fact
     * without anyone having chosen it.
     */
    revealRolesOnDeath: z.boolean(),
    /**
     * Should the narration texts to read aloud appear in the console? Presentation only
     * (no house rule, no effect on the statistics) — hence with a default,
     * unlike `revealRolesOnDeath`.
     */
    showNarration: z.boolean().default(true),
    /**
     * Day/night soundscape in the live console. Presentation only, like `showNarration`,
     * so it has a default; it can also be switched during the game (updateLiveSettingsSchema).
     */
    soundEnabled: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    const ids = new Set<string>()
    data.players.forEach((p, i) => {
      if (ids.has(p.playerId)) ctx.addIssue({ code: 'custom', message: 'Player appears twice', path: ['players', i] })
      ids.add(p.playerId)
    })
    if (data.roles.length !== data.players.length) {
      ctx.addIssue({
        code: 'custom',
        message: `Number of roles (${data.roles.length}) must match the number of players (${data.players.length})`,
        path: ['roles'],
      })
    }
    if (data.moderatorId && ids.has(data.moderatorId)) {
      ctx.addIssue({ code: 'custom', message: 'Moderator must not take part as a player', path: ['moderatorId'] })
    }
  })
/**
 * The PARSED type (z.output): `showNarration` is required here because `.default(true)`
 * applies when parsing. Whoever builds the body may omit the field — use `CreateLiveGamePayload` for that.
 */
export type CreateLiveGameInput = z.infer<typeof createLiveGameSchema>
/** The wire format before parsing: fields with a default are optional. */
export type CreateLiveGamePayload = z.input<typeof createLiveGameSchema>

/** Settings of a running live game that can be changed from the console. */
export const updateLiveSettingsSchema = z.object({
  soundEnabled: z.boolean(),
})
export type UpdateLiveSettingsInput = z.infer<typeof updateLiveSettingsSchema>
