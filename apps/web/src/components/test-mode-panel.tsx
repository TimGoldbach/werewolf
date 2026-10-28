'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Icon } from '@/components/pixel/icons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { clientFetch } from '@/lib/client-api'

interface ToggleResult {
  active: boolean
  purged: { games: number; players: number }
}

export function TestModePanel({ active }: { active: boolean }) {
  const t = useTranslations('testMode')
  const router = useRouter()
  const [count, setCount] = useState('30')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function toggle(next: boolean) {
    if (!next && !window.confirm(t('confirmEnd'))) {
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const res = await clientFetch<ToggleResult>('/test-mode', {
        method: 'POST',
        body: JSON.stringify({ active: next }),
      })
      if (!next) {
        setMsg(t('purged', { games: res.purged.games, players: res.purged.players }))
      }
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function generate() {
    setBusy(true)
    setMsg(null)
    const n = Math.max(1, Math.min(500, Number.parseInt(count, 10) || 30))
    try {
      const res = await clientFetch<{ created: number }>('/test-mode/generate', {
        method: 'POST',
        body: JSON.stringify({ count: n }),
      })
      setMsg(t('generated', { count: res.created }))
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className={active ? 'border-amber-500/60' : 'border-dashed'}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon name="potion-poison" size={18} /> {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {active ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="number"
                min={1}
                max={500}
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className="w-24"
              />
              <Button variant="secondary" onClick={generate} disabled={busy}>
                {t('generate')}
              </Button>
            </div>
            <Button variant="destructive" onClick={() => toggle(false)} disabled={busy}>
              {t('end')}
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={() => toggle(true)} disabled={busy}>
            {t('activate')}
          </Button>
        )}
        {msg && <p className="text-xs text-emerald-400">{msg}</p>}
        <p className="text-xs text-muted-foreground">
          {t('info')}
        </p>
      </CardContent>
    </Card>
  )
}
