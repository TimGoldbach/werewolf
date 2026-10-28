'use client'

import {
  ROLE_CATALOG,
  roleName,
  type Player,
  type ResolvedFaction,
  type StatsFilter,
} from '@werewolf/shared'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { useCatalog } from '@/lib/texts'
import { cn } from '@/lib/utils'

const FACTIONS: ResolvedFaction[] = ['village', 'werewolves', 'solo']

function dateOnlyDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}
function yearStart(): string {
  return `${new Date().getFullYear()}-01-01`
}
function toggle<T>(arr: T[] | undefined, v: T): T[] {
  const s = new Set(arr ?? [])
  if (s.has(v)) s.delete(v)
  else s.add(v)
  return [...s]
}

export function FilterBar({
  filter,
  onChange,
  players,
}: {
  filter: StatsFilter
  onChange: (f: StatsFilter) => void
  players: Player[]
}) {
  const t = useTranslations('stats')
  const catalog = useCatalog()
  const presets: { id: string; label: string; from: string | null }[] = [
    { id: 'all', label: t('filter.presets.all'), from: null },
    { id: 'days30', label: t('filter.presets.days30'), from: dateOnlyDaysAgo(30) },
    { id: 'days90', label: t('filter.presets.days90'), from: dateOnlyDaysAgo(90) },
    { id: 'thisYear', label: t('filter.presets.thisYear'), from: yearStart() },
  ]
  const activePlayers = new Set(filter.playerIds ?? [])
  const activeRoles = new Set(filter.roleIds ?? [])
  const activeFactions = new Set(filter.factions ?? [])
  const hasFilter = Boolean(
    filter.from || filter.to || filter.playerIds?.length || filter.roleIds?.length || filter.factions?.length,
  )

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="w-16 text-xs text-muted-foreground">{t('filter.period')}</span>
        {presets.map((p) => (
          <Chip
            key={p.id}
            active={(p.from ?? null) === (filter.from ?? null) && !filter.to}
            onClick={() => onChange({ ...filter, from: p.from, to: null })}
          >
            {p.label}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="w-16 text-xs text-muted-foreground">{t('filter.faction')}</span>
        {FACTIONS.map((f) => (
          <Chip
            key={f}
            active={activeFactions.has(f)}
            onClick={() => onChange({ ...filter, factions: toggle(filter.factions, f) })}
          >
            {catalog.factions[f]}
          </Chip>
        ))}
      </div>

      <details>
        <summary className="cursor-pointer text-xs text-muted-foreground">
          {t('filter.players', { count: activePlayers.size })}
        </summary>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {players.map((p) => (
            <Chip
              key={p.id}
              active={activePlayers.has(p.id)}
              onClick={() => onChange({ ...filter, playerIds: toggle(filter.playerIds, p.id) })}
            >
              {p.displayName}
            </Chip>
          ))}
        </div>
      </details>

      <details>
        <summary className="cursor-pointer text-xs text-muted-foreground">
          {t('filter.roles', { count: activeRoles.size })}
        </summary>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {ROLE_CATALOG.map((r) => (
            <Chip
              key={r.id}
              active={activeRoles.has(r.id)}
              onClick={() => onChange({ ...filter, roleIds: toggle(filter.roleIds, r.id) })}
            >
              {roleName(catalog, r.id)}
            </Chip>
          ))}
        </div>
      </details>

      {hasFilter && (
        <Button variant="ghost" size="sm" className="self-start" onClick={() => onChange({})}>
          {t('filter.reset')}
        </Button>
      )}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
        active
          ? 'border-primary bg-primary/15 text-primary'
          : 'border-border text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
