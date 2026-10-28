'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { clientFetch } from '@/lib/client-api'

export function DeleteGameButton({ gameId }: { gameId: string }) {
  const t = useTranslations('games.delete')
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function remove() {
    if (!window.confirm(t('confirm'))) return
    setBusy(true)
    await clientFetch(`/games/${gameId}`, { method: 'DELETE' }).catch(() => undefined)
    router.push('/games')
    router.refresh()
  }

  return (
    <Button variant="destructive" size="sm" onClick={remove} disabled={busy}>
      {busy ? t('busy') : t('button')}
    </Button>
  )
}
