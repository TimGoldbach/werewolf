import type { Player } from '@werewolf/shared'
import { getTranslations } from 'next-intl/server'
import { PlayersClient } from '@/components/players-client'
import { TestModePanel } from '@/components/test-mode-panel'
import { serverFetch } from '@/lib/server-api'

export const dynamic = 'force-dynamic'

export default async function PlayersPage() {
  const t = await getTranslations('players')
  const [players, testMode] = await Promise.all([
    serverFetch<Player[]>('/players?includeArchived=true'),
    serverFetch<{ active: boolean }>('/test-mode').catch(() => ({ active: false })),
  ])
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <PlayersClient initialPlayers={players} />
      <TestModePanel active={testMode.active} />
    </div>
  )
}
