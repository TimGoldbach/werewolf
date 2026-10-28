import type { WinnerGroup } from '../stats/scoring.js'
import type { CatalogTexts, RoleText } from './types.js'

/** Texts of a role; unknown ids (e.g. from an older catalog) fall back to the id. */
export function roleText(texts: CatalogTexts, roleId: string): RoleText {
  return texts.roles[roleId] ?? { name: roleId, description: '' }
}

export function roleName(texts: CatalogTexts, roleId: string): string {
  return roleText(texts, roleId).name
}

/** Label of a death cause; unknown values are passed through unchanged. */
export function deathCauseLabel(texts: CatalogTexts, cause: string): string {
  return (texts.deathCauses as Record<string, string>)[cause] ?? cause
}

/** Label and description of a win condition; unknown values fall back to the id. */
export function winConditionText(
  texts: CatalogTexts,
  condition: string,
): { label: string; description: string } {
  return (
    (texts.winConditions as Record<string, { label: string; description: string }>)[condition] ?? {
      label: condition,
      description: '',
    }
  )
}

export function winnerGroupLabel(texts: CatalogTexts, group: WinnerGroup): string {
  return group === 'none' ? texts.noWinner : texts.winCategories[group]
}
