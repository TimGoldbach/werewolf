'use client'

import {
  roleName,
  roleSetKey,
  winnerGroupLabel,
  WINNER_GROUPS,
  type SetSuggestion,
} from '@werewolf/shared'
import { useFormatter, useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'
import { RoleIcon } from '@/components/pixel/icons'
import { InfoDot } from '@/components/stats/info-dot'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useCatalog } from '@/lib/texts'
import { formatDate, formatDecimal } from '@/lib/utils'

/** This many sets are visible right away, the rest sits behind "Show all". */
const VISIBLE = 3

/**
 * Set suggestions in the deck area: role combinations the group has already played with exactly this
 * number of players — sorted by frequency × feedback (see
 * `computeSetSuggestions`). A tap adopts the set as the deck. Sets with a hidden role are left out.
 */
export function SetSuggestions({
  suggestions,
  playerCount,
  deck,
  onApply,
  hiddenRoles,
}: {
  /** all sets of all player counts, already sorted */
  suggestions: SetSuggestion[]
  playerCount: number
  deck: string[]
  onApply: (roleIds: string[]) => void
  /** roles the group has hidden */
  hiddenRoles?: ReadonlySet<string>
}) {
  const t = useTranslations('sets.suggestions')
  const [showAll, setShowAll] = useState(false)
  const played = useMemo(
    () => suggestions.filter((s) => s.playerCount === playerCount),
    [suggestions, playerCount],
  )
  const forCount = useMemo(
    () => played.filter((s) => s.roleIds.every((id) => !hiddenRoles?.has(id))),
    [played, hiddenRoles],
  )
  const deckKey = useMemo(() => roleSetKey(deck), [deck])

  if (playerCount < 3) return null
  if (forCount.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {played.length > 0 ? t('allHidden', { playerCount }) : t('noneForCount', { playerCount })}
      </p>
    )
  }

  const visible = showAll ? forCount : forCount.slice(0, VISIBLE)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <h3 className="text-sm font-semibold">{t('title', { playerCount })}</h3>
        <InfoDot text={t('info')} />
      </div>
      {visible.map((s, i) => (
        <SuggestionCard
          key={s.key}
          suggestion={s}
          top={i === 0}
          inDeck={s.key === deckKey}
          onApply={() => onApply(s.roleIds)}
        />
      ))}
      {forCount.length > VISIBLE && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="self-start text-sm text-muted-foreground hover:text-foreground"
        >
          {showAll ? t('showLess') : t('showAll', { count: forCount.length })}
        </button>
      )}
    </div>
  )
}

function SuggestionCard({
  suggestion: s,
  top,
  inDeck,
  onApply,
}: {
  suggestion: SetSuggestion
  top: boolean
  inDeck: boolean
  onApply: () => void
}) {
  const t = useTranslations('sets.suggestions')
  const catalog = useCatalog()
  const format = useFormatter()
  // roleIds come in catalogue order — so identical roles sit directly next to each other.
  const grouped = useMemo(() => {
    const out: Array<{ roleId: string; count: number }> = []
    for (const roleId of s.roleIds) {
      const last = out[out.length - 1]
      if (last?.roleId === roleId) last.count += 1
      else out.push({ roleId, count: 1 })
    }
    return out
  }, [s.roleIds])
  const outcomes = WINNER_GROUPS.filter((g) => s.outcomes[g] > 0)
    .map((g) => `${winnerGroupLabel(catalog, g)} ${s.outcomes[g]}`)
    .join(' · ')

  return (
    <Card className={top ? 'border-primary/60' : undefined}>
      <CardContent className="flex flex-col gap-2 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm font-medium">
            {top && <Badge>{t('suggested')}</Badge>}
            {t('timesPlayed', { count: s.games })}
          </span>
          {inDeck ? (
            <Button size="sm" variant="secondary" disabled className="shrink-0">
              {t('inDeck')}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant={top ? 'default' : 'outline'}
              onClick={onApply}
              className="shrink-0"
            >
              {t('apply')}
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {grouped.map(({ roleId, count }) => (
            <span
              key={roleId}
              className="flex items-center gap-1 rounded-md bg-accent/50 px-1.5 py-0.5 text-xs"
            >
              <RoleIcon roleId={roleId} size={14} />
              {count > 1 && `${count}× `}
              {roleName(catalog, roleId)}
            </span>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">
          <p>
            {s.avgRating !== null ? (
              <>
                <span className="text-amber-300">★</span>{' '}
                {t('ratingFrom', { avg: formatDecimal(format, s.avgRating), count: s.ratedGames })}
              </>
            ) : (
              t('noFeedback')
            )}{' '}
            · {t('lastPlayed', { date: formatDate(format, s.lastPlayedAt) })}
          </p>
          {outcomes && <p>{t('outcomes', { outcomes })}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
