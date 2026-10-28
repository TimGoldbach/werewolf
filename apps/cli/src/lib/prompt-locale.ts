import { MULTISELECT_INSTRUCTIONS, SELECT_INSTRUCTIONS } from '@clack/prompts'
import type { Messages } from '../i18n/index.ts'
import { pc } from './ui.ts'

/**
 * Translates the key hints clack shows below select prompts. clack has no setting for them,
 * but exports the arrays it reads, so they are replaced in place.
 */
export function localizePrompts(m: Messages): void {
  const navigate = `${pc.dim('↑/↓')} ${m.prompt.navigate}`
  const confirm = `${pc.dim('Enter:')} ${m.prompt.confirm}`
  SELECT_INSTRUCTIONS.splice(0, SELECT_INSTRUCTIONS.length, navigate, confirm)
  MULTISELECT_INSTRUCTIONS.splice(
    0,
    MULTISELECT_INSTRUCTIONS.length,
    navigate,
    `${pc.dim('Space:')} ${m.prompt.select}`,
    confirm,
  )
}
