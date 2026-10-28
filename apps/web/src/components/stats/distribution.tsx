import { useTranslations } from 'next-intl'
import { cn, formatPercent } from '@/lib/utils'

export interface Slice {
  key: string
  label: string
  count: number
  /** Tailwind class for the area */
  color: string
}

/**
 * A complete distribution as one stacked bar plus legend.
 *
 * Deliberately ONE bar instead of N progress bars: the shares add up to
 * 100 %, and that is exactly what should be visible. Single bars placed side by side
 * suggest independent rates that don't have to add up.
 */
export function Distribution({
  slices,
  total,
  emptyLabel,
  className,
}: {
  slices: Slice[]
  total: number
  emptyLabel?: string
  className?: string
}) {
  const t = useTranslations('stats')
  const shown = slices.filter((s) => s.count > 0)
  if (total === 0 || shown.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel ?? t('noData')}</p>
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex h-4 w-full overflow-hidden rounded-sm bg-muted" role="img">
        {shown.map((s) => (
          <div
            key={s.key}
            className={s.color}
            style={{ width: `${(s.count / total) * 100}%` }}
            title={`${s.label}: ${s.count} (${formatPercent(s.count / total)})`}
          />
        ))}
      </div>

      <ul className="flex flex-col gap-1 text-sm">
        {shown.map((s) => (
          <li key={s.key} className="flex items-baseline gap-2">
            <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-sm', s.color)} />
            <span className="flex-1 truncate text-muted-foreground">{s.label}</span>
            <span className="tabular-nums">{s.count}</span>
            <span className="w-10 text-right tabular-nums text-muted-foreground">
              {formatPercent(s.count / total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
