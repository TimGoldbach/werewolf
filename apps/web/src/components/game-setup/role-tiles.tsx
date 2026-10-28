'use client'

import { getRole, roleText, ROLE_CATALOG, type RoleCategory } from '@werewolf/shared'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'
import { SearchSelect, type SearchOption } from '@/components/ui/search-select'
import { FACTION_TONE } from '@/lib/setup-hints'
import { useCatalog } from '@/lib/texts'
import { cn } from '@/lib/utils'

const CATEGORY_ORDER: RoleCategory[] = ['werewolves', 'villagers', 'ambiguous', 'loners']

/** Faction colour stripe on the left edge of a role tile. */
export function FactionStripe({ roleId }: { roleId: string }) {
  const faction = getRole(roleId)?.faction
  return <span aria-hidden className={cn('w-1 shrink-0 self-stretch', faction && FACTION_TONE[faction].dot)} />
}

/** Search a role in the full catalogue (120+ roles) — for everything beyond the quick selection. */
export function RoleSearch({ onPick, placeholder }: { onPick: (roleId: string) => void; placeholder: string }) {
  const t = useTranslations('gameSetup.roleSearch')
  const catalog = useCatalog()
  // Names and aliases of the active language.
  const options = useMemo<SearchOption[]>(
    () =>
      ROLE_CATALOG.map((r) => {
        const text = roleText(catalog, r.id)
        return { value: r.id, label: text.name, group: r.category, keywords: text.aliases?.join(' ') }
      }),
    [catalog],
  )
  return (
    <SearchSelect
      options={options}
      groupOrder={CATEGORY_ORDER}
      groupLabels={catalog.roleCategories}
      value=""
      onChange={onPick}
      placeholder={placeholder}
      searchPlaceholder={t('searchPlaceholder')}
    />
  )
}
