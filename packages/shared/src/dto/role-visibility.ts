import { z } from 'zod'

/**
 * Which built-in roles the group has hidden. Hidden roles disappear from game setup and the
 * rules page; existing games and statistics keep them.
 */
export interface RoleVisibility {
  /** In catalog order */
  hiddenRoleIds: string[]
}

/** Shows or hides a single role (the role id is part of the path). */
export const setRoleHiddenSchema = z.object({
  hidden: z.boolean(),
})
export type SetRoleHiddenInput = z.infer<typeof setRoleHiddenSchema>

/** `classics`: hide everything except the classic base roles. `all`: show every role. */
export const ROLE_VISIBILITY_PRESETS = ['classics', 'all'] as const
export type RoleVisibilityPreset = (typeof ROLE_VISIBILITY_PRESETS)[number]

export const applyRolePresetSchema = z.object({
  preset: z.enum(ROLE_VISIBILITY_PRESETS),
})
export type ApplyRolePresetInput = z.infer<typeof applyRolePresetSchema>
