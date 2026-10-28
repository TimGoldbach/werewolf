'use client'

import { roleName } from '@werewolf/shared'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { RoleSearch } from '@/components/game-setup/role-tiles'
import { RoleIcon } from '@/components/pixel/icons'
import { sortRoles, useRoleLabel } from '@/lib/setup-hints'
import { useCatalog } from '@/lib/texts'
import { cn } from '@/lib/utils'

/**
 * Role "brush" for entering a game after the fact: pick a role, then tap everyone who had it.
 * Shows the group's quick selection plus everything already assigned; the rest of the
 * catalogue is reachable through search.
 */
export function RolePalette({
  activeRoleId,
  onActivate,
  assignedCounts,
  favoriteRoles,
}: {
  activeRoleId: string
  onActivate: (roleId: string) => void
  /** role → how many people already have it */
  assignedCounts: Map<string, number>
  favoriteRoles: string[]
}) {
  const t = useTranslations('gameSetup.palette')
  const catalog = useCatalog()
  const roleLabel = useRoleLabel()
  // Roles fetched via search stay as a chip, even if nobody has them (yet).
  const [extra, setExtra] = React.useState<string[]>([])
  const chips = React.useMemo(() => {
    const others = [...new Set([...extra, ...assignedCounts.keys(), activeRoleId])].filter(
      (id) => id && !favoriteRoles.includes(id),
    )
    return [...favoriteRoles, ...sortRoles(others)]
  }, [favoriteRoles, extra, assignedCounts, activeRoleId])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('groupLabel')}>
        {chips.map((id) => {
          const active = id === activeRoleId
          const n = assignedCounts.get(id) ?? 0
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => onActivate(id)}
              title={roleName(catalog, id)}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-full border px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_0_3px_hsl(var(--primary)/0.25)]'
                  : 'border-input bg-card text-foreground hover:bg-accent',
              )}
            >
              <RoleIcon roleId={id} size={16} className="shrink-0" />
              {roleLabel(id)}
              {n > 0 && (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-xs tabular-nums',
                    active ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {n}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <RoleSearch
        placeholder={t('searchPlaceholder')}
        onPick={(id) => {
          setExtra((prev) => (prev.includes(id) ? prev : [...prev, id]))
          onActivate(id)
        }}
      />
    </div>
  )
}
