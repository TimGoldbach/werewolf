'use client'

import {
  CLASSIC_ROLE_IDS,
  ROLE_CATALOG,
  roleText,
  type RoleVisibility,
  type RoleVisibilityPreset,
} from '@werewolf/shared'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { RoleIcon } from '@/components/pixel/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { clientFetch, useErrorText } from '@/lib/client-api'
import { groupRoles, roleMatches } from '@/lib/role-list'
import { useAppLocale, useCatalog } from '@/lib/texts'
import { cn } from '@/lib/utils'

/** Issue form for proposing a role — new roles come in through the code catalog, not the app. */
const ROLE_PROPOSAL_URL =
  'https://github.com/TimGoldbach/werewolf/issues/new?template=role-proposal.yml'

const CLASSICS = new Set(CLASSIC_ROLE_IDS)
const PRESETS: RoleVisibilityPreset[] = ['classics', 'all']

function withRole(set: Set<string>, roleId: string, included: boolean): Set<string> {
  const next = new Set(set)
  if (included) next.add(roleId)
  else next.delete(roleId)
  return next
}

/**
 * Show/hide switch per catalog role plus the two presets. Toggles apply right away (optimistic,
 * rolled back if the API refuses); a preset replaces the whole selection.
 */
export function RoleSettings({ initialHidden }: { initialHidden: string[] }) {
  const t = useTranslations('roleSettings')
  const catalog = useCatalog()
  const locale = useAppLocale()
  const errorText = useErrorText()
  const router = useRouter()
  const [hidden, setHidden] = useState(() => new Set(initialHidden))
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const q = query.trim()

  const grouped = useMemo(() => groupRoles(catalog, locale), [catalog, locale])
  const groups = grouped.map((g) => ({
    ...g,
    all: g.roles,
    roles: q ? g.roles.filter((r) => roleMatches(catalog, r, q)) : g.roles,
  }))
  const hits = groups.reduce((n, g) => n + g.roles.length, 0)

  async function toggle(roleId: string) {
    const hide = !hidden.has(roleId)
    setError(null)
    setHidden((prev) => withRole(prev, roleId, hide))
    try {
      await clientFetch<RoleVisibility>(`/role-visibility/${encodeURIComponent(roleId)}`, {
        method: 'PUT',
        body: JSON.stringify({ hidden: hide }),
      })
      // Drops cached pages, so game setup shows the new selection right away.
      router.refresh()
    } catch (err) {
      setHidden((prev) => withRole(prev, roleId, !hide))
      setError(errorText(err))
    }
  }

  async function applyPreset(preset: RoleVisibilityPreset) {
    if (!window.confirm(t(`presets.${preset}.confirm`, { count: CLASSIC_ROLE_IDS.length }))) return
    setBusy(true)
    setError(null)
    try {
      const res = await clientFetch<RoleVisibility>('/role-visibility/preset', {
        method: 'POST',
        body: JSON.stringify({ preset }),
      })
      setHidden(new Set(res.hiddenRoleIds))
      router.refresh()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3 pt-5">
          <p className="text-sm font-medium tabular-nums">
            {t('count', { visible: ROLE_CATALOG.length - hidden.size, total: ROLE_CATALOG.length })}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => applyPreset(preset)}
                className="h-auto flex-col items-start gap-0.5 whitespace-normal py-2.5 text-left"
              >
                <span>{t(`presets.${preset}.label`)}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {t(`presets.${preset}.hint`, { count: CLASSIC_ROLE_IDS.length })}
                </span>
              </Button>
            ))}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Input
        type="search"
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchLabel')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {hits === 0 && <p className="text-sm text-muted-foreground">{t('noMatch', { query: q })}</p>}

      {groups.map(
        (g) =>
          g.roles.length > 0 && (
            <section key={g.category} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-semibold">{catalog.roleCategories[g.category]}</h2>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {t('categoryCount', {
                    visible: g.all.filter((r) => !hidden.has(r.id)).length,
                    total: g.all.length,
                  })}
                </span>
              </div>
              <ul className="flex flex-col divide-y divide-border/60 rounded-lg border border-border bg-card">
                {g.roles.map((role) => {
                  const visible = !hidden.has(role.id)
                  const text = roleText(catalog, role.id)
                  return (
                    <li key={role.id} className="flex items-center gap-3 p-3">
                      <RoleIcon
                        roleId={role.id}
                        size={24}
                        className={cn('shrink-0 transition-opacity', !visible && 'opacity-40')}
                      />
                      <div
                        className={cn(
                          'min-w-0 flex-1 transition-opacity',
                          !visible && 'opacity-50',
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-medium">{text.name}</span>
                          {CLASSICS.has(role.id) && <Badge variant="muted">{t('classic')}</Badge>}
                        </div>
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {text.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={visible}
                        aria-label={t('toggle', { name: text.name })}
                        disabled={busy}
                        onClick={() => toggle(role.id)}
                        className={cn(
                          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                          visible ? 'bg-primary' : 'bg-muted',
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            'inline-block h-5 w-5 rounded-full bg-background shadow transition-transform',
                            visible ? 'translate-x-6' : 'translate-x-1',
                          )}
                        />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ),
      )}

      <p className="text-sm text-muted-foreground">
        {t.rich('missing', {
          link: (chunks) => (
            <a
              href={ROLE_PROPOSAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-2"
            >
              {chunks}
            </a>
          ),
        })}
      </p>
    </div>
  )
}
