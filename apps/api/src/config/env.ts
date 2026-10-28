import { z } from 'zod'

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  GATE_PASSWORD: z.string().optional().default(''),
  GATE_PASSWORD_HASH: z.string().optional().default(''),
  SESSION_SECRET: z.string().min(8, 'SESSION_SECRET must be at least 8 characters long'),
  SESSION_TTL: z.string().default('30d'),
  API_PORT: z.coerce.number().int().positive().default(3001),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  NODE_ENV: z.string().default('development'),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config)
  if (!parsed.success) {
    throw new Error(
      'Invalid environment variables: ' + JSON.stringify(parsed.error.flatten().fieldErrors),
    )
  }
  if (!parsed.data.GATE_PASSWORD && !parsed.data.GATE_PASSWORD_HASH) {
    throw new Error('Either GATE_PASSWORD or GATE_PASSWORD_HASH must be set.')
  }
  return parsed.data
}
