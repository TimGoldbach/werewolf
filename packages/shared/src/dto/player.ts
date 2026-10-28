import { z } from 'zod'

export const createPlayerSchema = z.object({
  displayName: z.string().trim().min(2, 'At least 2 characters').max(40, 'At most 40 characters'),
})
export type CreatePlayerInput = z.infer<typeof createPlayerSchema>

export const updatePlayerSchema = z.object({
  displayName: z.string().trim().min(2).max(40).optional(),
  active: z.boolean().optional(),
})
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>

export const playerSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  active: z.boolean(),
  createdAt: z.string(),
})
export type Player = z.infer<typeof playerSchema>
