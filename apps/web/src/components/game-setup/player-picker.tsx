'use client'

import type { Player } from '@werewolf/shared'
import { Mic, RotateCcw, UserPlus } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import * as React from 'react'
import { clientFetch, useErrorText } from '@/lib/client-api'
import { shortDay, type RecentLineup } from '@/lib/setup-hints'
import { useAppLocale } from '@/lib/texts'
import { cn } from '@/lib/utils'

const chipBase =
  'inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

/**
 * "Tue, 10/06 · 12" — and if two line-ups got the same label (two rounds on the same evening with
 * the same number of people), the difference to the most recent one: "Today · 12 · +Ida −Clara".
 */
function lineupChipLabels(
  lineups: RecentLineup[],
  name: (id: string) => string,
  day: (iso: string) => string,
): string[] {
  const base = lineups.map((l) => `${day(l.playedAt)} · ${l.playerIds.length}`)
  const latest = lineups[0]
  return base.map((label, i) => {
    if (i === 0 || !latest || base.indexOf(label) === base.lastIndexOf(label)) return label
    const ids = new Set(lineups[i]!.playerIds)
    const latestIds = new Set(latest.playerIds)
    const diff = [
      ...lineups[i]!.playerIds.filter((id) => !latestIds.has(id)).map((id) => `+${name(id)}`),
      ...latest.playerIds.filter((id) => !ids.has(id)).map((id) => `−${name(id)}`),
    ]
    return `${label} · ${diff.slice(0, 3).join(' ')}${diff.length > 3 ? ' …' : ''}`
  })
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((id) => set.has(id))
}

/**
 * "Who's playing?" — the whole roster as chips, one tap adds or removes someone.
 * Regular players come first; earlier line-ups can be adopted with one tap, and
 * anyone new is created right here.
 */
export function PlayerPicker({
  players,
  selectedIds,
  moderatorId,
  playerOrder,
  recentLineups,
  onChange,
  onModeratorChange,
  onPlayerCreated,
}: {
  players: Player[]
  /** selection in order of addition */
  selectedIds: string[]
  moderatorId: string
  playerOrder: string[]
  recentLineups: RecentLineup[]
  onChange: (ids: string[]) => void
  onModeratorChange: (id: string) => void
  /** newly created ⇒ the caller adds the person to the roster AND to the selection */
  onPlayerCreated: (player: Player) => void
}) {
  const t = useTranslations('gameSetup.picker')
  const tc = useTranslations('common')
  const format = useFormatter()
  const locale = useAppLocale()
  const errorText = useErrorText()
  const [query, setQuery] = React.useState('')
  const [creating, setCreating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const selected = React.useMemo(() => new Set(selectedIds), [selectedIds])
  const byId = React.useMemo(() => new Map(players.map((p) => [p.id, p])), [players])

  // Fix the order once and do NOT re-sort on tap — otherwise the chips jump around.
  const roster = React.useMemo(() => {
    const rank = new Map(playerOrder.map((id, i) => [id, i]))
    return [...players].sort(
      (a, b) =>
        (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity) ||
        a.displayName.localeCompare(b.displayName, locale),
    )
  }, [players, playerOrder, locale])

  // Only show archived players if they are already involved (e.g. when editing/copying).
  const visible = roster.filter((p) => p.active || selected.has(p.id) || p.id === moderatorId)
  const q = query.trim().toLowerCase()
  const matches = q ? visible.filter((p) => p.displayName.toLowerCase().includes(q)) : visible
  const exact = q ? players.some((p) => p.displayName.toLowerCase() === q) : true
  const canCreate = q.length >= 2 && !exact

  const lineups = recentLineups
    .map((l) => ({ ...l, playerIds: l.playerIds.filter((id) => byId.get(id)?.active) }))
    .filter((l) => l.playerIds.length >= 3)
  const lineupLabels = lineupChipLabels(
    lineups,
    (id) => byId.get(id)?.displayName ?? '?',
    (iso) => shortDay(iso, format, { today: tc('today'), yesterday: tc('yesterday') }),
  )

  function toggle(id: string) {
    if (id === moderatorId) {
      // Tapping the moderator = plays along after all; then (for now) nobody moderates.
      onModeratorChange('')
      onChange([...selectedIds, id])
      return
    }
    onChange(selected.has(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id])
  }

  function applyLineup(lineup: RecentLineup) {
    onChange(lineup.playerIds)
    const mod = lineup.moderatorId
    if (mod && byId.get(mod)?.active && !lineup.playerIds.includes(mod)) onModeratorChange(mod)
    else if (lineup.playerIds.includes(moderatorId)) onModeratorChange('')
  }

  async function create() {
    const displayName = query.trim()
    if (displayName.length < 2 || creating) return
    setCreating(true)
    setError(null)
    try {
      const player = await clientFetch<Player>('/players', {
        method: 'POST',
        body: JSON.stringify({ displayName }),
      })
      onPlayerCreated(player)
      setQuery('')
    } catch (err) {
      setError(errorText(err, t('createFailed')))
    } finally {
      setCreating(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (matches.length === 1) {
      toggle(matches[0]!.id)
      setQuery('')
    } else if (matches.length === 0 && canCreate) {
      void create()
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">
          {t('heading')} <span className="text-muted-foreground">({selectedIds.length})</span>
        </h2>
        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t('deselectAll')}
          </button>
        )}
      </div>

      {lineups.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{t('lastTime')}</span>
          {lineups.map((l, i) => {
            const active = sameSet(l.playerIds, selectedIds)
            return (
              <button
                key={l.gameId}
                type="button"
                onClick={() => applyLineup(l)}
                aria-pressed={active}
                title={l.playerIds.map((id) => byId.get(id)?.displayName).join(', ')}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors',
                  active
                    ? 'border-primary bg-primary/15 text-foreground'
                    : 'border-input text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                {/* "Today"/"Yesterday" depend on time of day and time zone — server and browser may differ. */}
                <span suppressHydrationWarning>{lineupLabels[i]}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setError(null)
          }}
          onKeyDown={onKeyDown}
          placeholder={t('searchPlaceholder')}
          enterKeyHint="done"
          className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {canCreate && (
          <button
            type="button"
            onClick={() => void create()}
            disabled={creating}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md bg-secondary px-3 text-sm font-medium hover:bg-secondary/80 disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" aria-hidden />
            {t('create')}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {matches.map((p) => {
          if (p.id === moderatorId) {
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                title={t('moderatorTitle')}
                className={cn(chipBase, 'border-dashed border-input text-muted-foreground hover:text-foreground')}
              >
                <Mic className="h-3.5 w-3.5" aria-hidden />
                {p.displayName}
                <span className="text-xs">{t('moderatorTag')}</span>
              </button>
            )
          }
          const on = selected.has(p.id)
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(p.id)}
              className={cn(
                chipBase,
                on
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-card text-foreground hover:bg-accent',
              )}
            >
              {/* No check-mark icon: it widens the chip and would make the other chips jump on tap. */}
              {p.displayName}
            </button>
          )
        })}
        {matches.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {canCreate
              ? t('noneNamed', { name: query.trim() })
              : q
                ? t('noMatch')
                : t('emptyRoster')}
          </p>
        )}
      </div>
    </section>
  )
}
