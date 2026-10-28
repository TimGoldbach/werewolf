'use client'

import type { Player } from '@werewolf/shared'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { clientFetch, useErrorText } from '@/lib/client-api'
import { useAppLocale } from '@/lib/texts'

export function PlayersClient({ initialPlayers }: { initialPlayers: Player[] }) {
  const t = useTranslations('players')
  const errorText = useErrorText()
  const locale = useAppLocale()
  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const created = await clientFetch<Player>('/players', {
        method: 'POST',
        body: JSON.stringify({ displayName: name.trim() }),
      })
      setPlayers((prev) => [...prev, created].sort((a, b) => a.displayName.localeCompare(b.displayName, locale)))
      setName('')
    } catch (err) {
      setError(errorText(err, t('addFailed')))
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(player: Player) {
    const updated = await clientFetch<Player>(`/players/${player.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: !player.active }),
    })
    setPlayers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  const active = players.filter((p) => p.active)
  const archived = players.filter((p) => !p.active)

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="pt-5">
          <form onSubmit={addPlayer} className="flex gap-2">
            <Input
              placeholder={t('newPlayerPlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button type="submit" disabled={busy || name.trim().length < 2}>
              {t('add')}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        {active.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3"
          >
            <span className="font-medium">{p.displayName}</span>
            <Button variant="ghost" size="sm" onClick={() => toggleActive(p)}>
              {t('archive')}
            </Button>
          </div>
        ))}
        {active.length === 0 && <p className="text-sm text-muted-foreground">{t('noActive')}</p>}
      </div>

      {archived.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">{t('archived')}</h2>
          {archived.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-md border border-border/50 px-4 py-3 opacity-70"
            >
              <span className="flex items-center gap-2">
                {p.displayName}
                <Badge variant="muted">{t('inactive')}</Badge>
              </span>
              <Button variant="ghost" size="sm" onClick={() => toggleActive(p)}>
                {t('reactivate')}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
