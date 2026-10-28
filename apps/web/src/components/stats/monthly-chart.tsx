import type { MonthlyPoint, WinnerGroup } from '@werewolf/shared'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

/**
 * Games per month as stacked bars, split by winner.
 *
 * Deliberately counts instead of rates: this group plays one to four games a
 * month, so any rate jumps between 0 % and 100 % and shows noise instead of a
 * trend. The bar height says "how much was played", the colour shares "who
 * won" — both without an interpretation trap.
 */
export function MonthlyChart({
  points,
  groups,
  colors,
  labels,
}: {
  points: MonthlyPoint[]
  groups: WinnerGroup[]
  colors: Record<WinnerGroup, string>
  labels: Record<WinnerGroup, string>
}) {
  const t = useTranslations('stats')
  if (points.length === 0) return <p className="text-sm text-muted-foreground">{t('noData')}</p>

  const max = Math.max(...points.map((p) => p.games), 1)
  // Only as many month labels as fit without overlapping.
  const labelStep = points.length <= 8 ? 1 : Math.ceil(points.length / 6)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-1 overflow-x-auto pb-1" style={{ height: 132 }}>
        {points.map((p, i) => (
          <div key={p.period} className="flex min-w-6 flex-1 flex-col items-center gap-1">
            <span className="text-[10px] tabular-nums text-muted-foreground">{p.games}</span>
            <div
              className="flex w-full flex-col-reverse overflow-hidden rounded-sm"
              style={{ height: `${(p.games / max) * 92}px` }}
              title={t('monthly.gamesTitle', { period: p.period, count: p.games })}
            >
              {groups.map((g) =>
                p.wins[g] > 0 ? (
                  <div
                    key={g}
                    className={colors[g]}
                    style={{ height: `${(p.wins[g] / p.games) * 100}%` }}
                    title={`${labels[g]}: ${p.wins[g]}`}
                  />
                ) : null,
              )}
            </div>
            <span className="h-3 text-[10px] text-muted-foreground">
              {i % labelStep === 0 ? `${p.period.slice(5)}/${p.period.slice(2, 4)}` : ''}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        {groups.map((g) => (
          <span key={g} className="flex items-center gap-1.5">
            <span className={cn('inline-block h-2 w-3 rounded-sm', colors[g])} />
            {labels[g]}
          </span>
        ))}
      </div>
    </div>
  )
}
