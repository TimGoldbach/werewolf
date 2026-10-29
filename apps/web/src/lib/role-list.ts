import {
  ROLE_CATALOG,
  roleText,
  type CatalogTexts,
  type Locale,
  type RoleCategory,
  type RoleDef,
} from '@werewolf/shared'

const CATEGORY_ORDER: RoleCategory[] = ['werewolves', 'villagers', 'ambiguous', 'loners']

/** "Der einfache Werwolf" → "einfache Werwolf": alphabetical, ignoring the German article. */
function sortKey(name: string, locale: Locale): string {
  return locale === 'de' ? name.replace(/^(der|die|das)\s+/i, '') : name
}

/** Roles per category, each sorted alphabetically by name in the active language. */
export function groupRoles(
  texts: CatalogTexts,
  locale: Locale,
  roles: readonly RoleDef[] = ROLE_CATALOG,
): { category: RoleCategory; roles: RoleDef[] }[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    roles: roles
      .filter((r) => r.category === category)
      .sort((a, b) =>
        sortKey(roleText(texts, a.id).name, locale).localeCompare(
          sortKey(roleText(texts, b.id).name, locale),
          locale,
        ),
      ),
  }))
}

/** Every word of the query appears in the role's name, aliases or description. */
export function roleMatches(texts: CatalogTexts, role: RoleDef, query: string): boolean {
  const { name, aliases, description } = roleText(texts, role.id)
  const hay = `${name} ${aliases?.join(' ') ?? ''} ${description}`.toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => hay.includes(t))
}
