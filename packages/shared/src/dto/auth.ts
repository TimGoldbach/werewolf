import { z } from 'zod'

export const loginSchema = z.object({
  password: z.string().min(1, 'Password required'),
})
export type LoginInput = z.infer<typeof loginSchema>

export const sessionInfoSchema = z.object({
  authenticated: z.boolean(),
})
export type SessionInfo = z.infer<typeof sessionInfoSchema>
