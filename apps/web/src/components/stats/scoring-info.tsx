import { SCORING, WIN_CATEGORIES } from '@werewolf/shared'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { useCatalog } from '@/lib/texts'

/** `+12` / `−3` — sign always visible, real minus character. */
function signed(value: number): string {
  return value < 0 ? `−${Math.abs(value)}` : `+${value}`
}

function Row({ label, points, hint }: { label: string; points: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/50 py-1.5 last:border-0">
      <div className="min-w-0">
        <div className="text-foreground">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      <div className="shrink-0 font-semibold tabular-nums">{points}</div>
    </div>
  )
}

/**
 * Explains the leaderboard's scoring system — the numbers come directly from
 * `SCORING`, so text and calculation cannot drift apart.
 */
export function ScoringInfo({ minGames }: { minGames: number }) {
  const t = useTranslations('leaderboard.scoring')
  const catalog = useCatalog()
  const { win } = SCORING

  return (
    <Card>
      <CardContent className="pt-5">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-semibold">
            {t('title')}
            <span className="text-xs font-normal text-muted-foreground group-open:hidden">{t('show')}</span>
            <span className="hidden text-xs font-normal text-muted-foreground group-open:inline">{t('hide')}</span>
          </summary>

          <div className="mt-3 flex flex-col gap-4 text-sm">
            <p className="text-muted-foreground">
              {t.rich('intro', {
                strong: (chunks) => <strong className="font-medium text-foreground">{chunks}</strong>,
              })}
            </p>

            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('perGame')}
              </div>
              {WIN_CATEGORIES.map((c) => (
                <Row
                  key={c}
                  label={t('win', { category: catalog.winCategories[c] })}
                  hint={catalog.winCategoryRationale[c]}
                  points={signed(win[c])}
                />
              ))}
              <Row label={t('loss')} hint={t('lossHint')} points="0" />
            </div>

            <ul className="flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
              <li>{t('averageRule')}</li>
              <li>{t('categoryRule')}</li>
              <li>{t('qualificationRule', { minGames })}</li>
              <li>{t('tiebreakRule')}</li>
            </ul>
          </div>
        </details>
      </CardContent>
    </Card>
  )
}
