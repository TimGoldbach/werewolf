'use client'

import { SET_RATINGS, type SetRating } from '@werewolf/shared'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Icon } from '@/components/pixel/icons'
import { Card, CardContent } from '@/components/ui/card'
import { clientFetch, useErrorText } from '@/lib/client-api'
import { useCatalog } from '@/lib/texts'
import { cn } from '@/lib/utils'

/**
 * The group's feedback on the set, right after the game. While unrated it sits as a clear question
 * at the top of the game page (live "rate" and quick entry lead there), once rated as a
 * quiet row that can be changed with a tap. The rating weights the set suggestions.
 */
export function SetFeedback({
  gameId,
  playerCount,
  initial,
}: {
  gameId: string
  playerCount: number
  initial: SetRating | null
}) {
  const t = useTranslations('sets.feedback')
  const catalog = useCatalog()
  const errorText = useErrorText()
  const router = useRouter()
  const [rating, setRating] = useState<SetRating | null>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function rate(value: SetRating) {
    if (value === rating) return
    const previous = rating
    // Optimistic: at the table the tap should register immediately; revert on error.
    setRating(value)
    setBusy(true)
    setError(null)
    try {
      await clientFetch(`/games/${gameId}/feedback`, {
        method: 'PUT',
        body: JSON.stringify({ setRating: value }),
      })
      router.refresh()
    } catch (err) {
      setRating(previous)
      setError(errorText(err, t('saveFailed')))
    } finally {
      setBusy(false)
    }
  }

  const asking = rating === null

  return (
    <Card className={cn(asking && 'border-primary bg-primary/10 ring-2 ring-primary/40')}>
      <CardContent className="flex flex-col gap-2 py-4">
        <div>
          <p className="font-semibold">{asking ? t('question') : t('heading')}</p>
          {asking && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t('hint', { playerCount })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1" role="radiogroup" aria-label={t('rateGroup')}>
          {SET_RATINGS.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={t('starLabel', { value, label: catalog.setRatings[value] })}
              title={catalog.setRatings[value]}
              disabled={busy}
              onClick={() => rate(value)}
              className="flex h-11 w-11 items-center justify-center rounded-md transition-colors hover:bg-accent disabled:cursor-wait"
            >
              <Icon
                name="star"
                size={26}
                className={cn(
                  'transition-opacity',
                  (rating === null || value > rating) && 'opacity-25 grayscale',
                )}
              />
            </button>
          ))}
          {rating !== null && <span className="ml-2 text-sm font-medium">{catalog.setRatings[rating]}</span>}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
