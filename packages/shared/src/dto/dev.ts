import { z } from 'zod'

/** Test mode on/off. Switching it off deletes all data created in test mode. */
export const setTestModeSchema = z.object({
  active: z.boolean(),
})
export type SetTestModeInput = z.infer<typeof setTestModeSchema>

export const generateGamesSchema = z.object({
  count: z.number().int().min(1).max(500).default(30),
})
export type GenerateGamesInput = z.infer<typeof generateGamesSchema>

export interface TestModeState {
  active: boolean
}
