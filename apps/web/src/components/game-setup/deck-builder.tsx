'use client'

import { getRole, roleName } from '@werewolf/shared'
import { Minus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { FactionStripe, RoleSearch } from '@/components/game-setup/role-tiles'
import { RoleIcon } from '@/components/pixel/icons'
import { Button } from '@/components/ui/button'
import {
  FACTION_TONE,
  sortRoles,
  suggestedWolves,
  useRoleLabel,
  VILLAGER_ROLE_ID,
  type FactionKey,
} from '@/lib/setup-hints'
import { useCatalog } from '@/lib/texts'
import { cn } from '@/lib/utils'

function countRoles(roles: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const id of roles) counts.set(id, (counts.get(id) ?? 0) + 1)
  return counts
}

/**
 * The role deck of a live game as tiles with a counter: tap = one more, "−" = one
 * fewer. Multi-copy roles (3 werewolves) thus take three taps instead of three dropdown rounds;
 * one tap fills the rest up with villagers.
 */
export function DeckBuilder({
  deck,
  onChange,
  playerCount,
  favoriteRoles,
  children,
}: {
  deck: string[]
  onChange: (deck: string[]) => void
  playerCount: number
  favoriteRoles: string[]
  /** space above the tiles, e.g. for ready-made set suggestions */
  children?: React.ReactNode
}) {
  const t = useTranslations('gameSetup.deck')
  const catalog = useCatalog()
  const roleLabel = useRoleLabel()
  // Roles added via search stay as a tile, even when their counter drops back to 0.
  const [extra, setExtra] = React.useState<string[]>([])
  const counts = React.useMemo(() => countRoles(deck), [deck])
  const tiles = React.useMemo(() => {
    const others = [...new Set([...extra, ...deck])].filter((id) => !favoriteRoles.includes(id))
    return [...favoriteRoles, ...sortRoles(others)]
  }, [favoriteRoles, extra, deck])

  const missing = playerCount - deck.length
  const byFaction = new Map<FactionKey, number>()
  for (const id of deck) {
    const faction = getRole(id)?.faction
    if (faction) byFaction.set(faction, (byFaction.get(faction) ?? 0) + 1)
  }
  const wolves = byFaction.get('werewolves') ?? 0
  const wolfHint = suggestedWolves(playerCount)

  function add(id: string) {
    onChange([...deck, id])
  }

  function removeOne(id: string) {
    const i = deck.lastIndexOf(id)
    if (i >= 0) onChange([...deck.slice(0, i), ...deck.slice(i + 1)])
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-semibold">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">{t('hint')}</p>
      </div>

      {children}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tiles.map((id) => {
          const n = counts.get(id) ?? 0
          const name = roleName(catalog, id)
          return (
            <div
              key={id}
              className={cn(
                'flex h-12 overflow-hidden rounded-lg border bg-card transition-colors',
                n > 0 ? 'border-primary/70 bg-primary/10' : 'border-border',
              )}
            >
              <FactionStripe roleId={id} />
              <button
                type="button"
                onClick={() => add(id)}
                title={name}
                aria-label={n > 0 ? t('addRoleCounted', { name, count: n }) : t('addRole', { name })}
                className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 text-left active:bg-accent/60"
              >
                {/* Counter as a badge on the icon — keeps the width free for the name. */}
                <span className="relative shrink-0">
                  <RoleIcon roleId={id} size={22} />
                  {n > 0 && (
                    <span className="absolute -right-2 -top-2 h-[18px] min-w-[18px] rounded-full bg-primary px-1 text-center text-[11px] font-bold leading-[18px] tabular-nums text-primary-foreground ring-2 ring-card">
                      {n}
                    </span>
                  )}
                </span>
                <span className="line-clamp-2 min-w-0 flex-1 hyphens-auto break-words text-sm font-medium leading-tight">
                  {roleLabel(id)}
                </span>
              </button>
              {n > 0 && (
                <button
                  type="button"
                  onClick={() => removeOne(id)}
                  aria-label={t('removeOne', { name })}
                  className="flex w-9 shrink-0 items-center justify-center border-l border-border/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Minus className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
          )
        })}
      </div>

      <RoleSearch
        placeholder={t('searchPlaceholder')}
        onPick={(id) => {
          add(id)
          setExtra((prev) => (prev.includes(id) ? prev : [...prev, id]))
        }}
      />

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card/50 p-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span
            className={cn(
              'font-semibold tabular-nums',
              playerCount > 0 && missing === 0 ? 'text-emerald-400' : 'text-amber-400',
            )}
          >
            {t('roleCount', { deck: deck.length, players: playerCount })}
          </span>
          {(['werewolves', 'village', 'variable', 'solo'] as const).map((f) =>
            byFaction.get(f) ? (
              <span key={f} className="inline-flex items-center gap-1 text-muted-foreground">
                <span aria-hidden className={cn('h-2 w-2 rounded-full', FACTION_TONE[f].dot)} />
                {byFaction.get(f)} {t(`factionShort.${f}`)}
              </span>
            ) : null,
          )}
        </div>
        {wolfHint && wolves !== wolfHint.count && (
          <p className="text-xs text-muted-foreground">
            {t('wolfRule', { players: playerCount, count: wolfHint.count })}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {missing > 0 && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => onChange([...deck, ...Array<string>(missing).fill(VILLAGER_ROLE_ID)])}
            >
              {t('fillVillagers', { count: missing })}
            </Button>
          )}
          {missing < 0 && (
            <span className="text-sm text-amber-400">{t('tooMany', { count: -missing })}</span>
          )}
          {deck.length > 0 && (
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange([])}>
              {t('clear')}
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
