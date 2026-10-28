'use client'

import {
  ROLE_CATALOG,
  roleText,
  type CatalogTexts,
  type Locale,
  type RoleCategory,
  type RoleDef,
} from '@werewolf/shared'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { RoleIcon } from '@/components/pixel/icons'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useAppLocale, useCatalog } from '@/lib/texts'

const CATEGORY_ORDER: RoleCategory[] = ['werewolves', 'villagers', 'ambiguous', 'loners']

/** "Der einfache Werwolf" → "einfache Werwolf": alphabetical, ignoring the German article. */
function sortKey(name: string, locale: Locale): string {
  return locale === 'de' ? name.replace(/^(der|die|das)\s+/i, '') : name
}

function matches(texts: CatalogTexts, role: RoleDef, query: string): boolean {
  const { name, aliases, description } = roleText(texts, role.id)
  const hay = `${name} ${aliases?.join(' ') ?? ''} ${description}`.toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => hay.includes(t))
}

/** All roles of the catalogue with a short description — searchable by name, alias and text. */
export function RoleGuide() {
  const t = useTranslations('rules.roleGuide')
  const catalog = useCatalog()
  const locale = useAppLocale()
  const [query, setQuery] = React.useState('')
  const q = query.trim()

  const grouped = React.useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        roles: ROLE_CATALOG.filter((r) => r.category === category).sort((a, b) =>
          sortKey(roleText(catalog, a.id).name, locale).localeCompare(
            sortKey(roleText(catalog, b.id).name, locale),
            locale,
          ),
        ),
      })),
    [catalog, locale],
  )
  const groups = grouped.map((g) => ({
    ...g,
    roles: q ? g.roles.filter((r) => matches(catalog, r, q)) : g.roles,
  }))
  const hits = groups.reduce((n, g) => n + g.roles.length, 0)

  function wakeLabel(role: RoleDef): string | null {
    if (!role.wakesAtNight) return null
    if (role.firstNightOnly) return t('wake.first')
    if (role.wakeEveryNight) return t('wake.every')
    return t('wake.night')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Input
          type="search"
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchLabel')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <nav className="flex flex-wrap gap-1.5 text-sm" aria-label={t('categoriesLabel')}>
          {groups.filter((g) => g.roles.length > 0).map((g) => (
            <a
              key={g.category}
              href={`#rollen-${g.category}`}
              className="rounded-full border border-input px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              {catalog.roleCategories[g.category]} <span className="tabular-nums">{g.roles.length}</span>
            </a>
          ))}
        </nav>
      </div>

      {hits === 0 && <p className="text-sm text-muted-foreground">{t('noMatch', { query: q })}</p>}

      {groups.map(
        (g) =>
          g.roles.length > 0 && (
            <section key={g.category} id={`rollen-${g.category}`} className="flex scroll-mt-4 flex-col gap-2">
              <div>
                <h3 className="font-semibold">{catalog.roleCategories[g.category]}</h3>
                <p className="text-sm text-muted-foreground">{t(`intro.${g.category}`)}</p>
              </div>
              <ul className="flex flex-col divide-y divide-border/60 rounded-lg border border-border bg-card">
                {g.roles.map((role) => {
                  const wake = wakeLabel(role)
                  const text = roleText(catalog, role.id)
                  return (
                    <li key={role.id} className="flex gap-3 p-3">
                      <RoleIcon roleId={role.id} size={24} className="mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-medium">{text.name}</span>
                          <Badge variant={role.faction}>{catalog.factions[role.faction]}</Badge>
                          {wake && <Badge variant="muted">{wake}</Badge>}
                        </div>
                        {text.aliases && text.aliases.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {t('aliases', { names: text.aliases.join(', ') })}
                          </div>
                        )}
                        <p className="mt-1 text-sm text-muted-foreground">{text.description}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ),
      )}
    </div>
  )
}
