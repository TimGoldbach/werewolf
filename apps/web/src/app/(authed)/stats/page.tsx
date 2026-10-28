import type { GameResultRecord, Player } from '@werewolf/shared'
import { getTranslations } from 'next-intl/server'
import { StatsExplorer } from '@/components/stats/stats-explorer'
import { serverFetch } from '@/lib/server-api'

export const dynamic = 'force-dynamic'

export default async function StatsPage() {
  const t = await getTranslations('stats')
  const [records, players] = await Promise.all([
    serverFetch<GameResultRecord[]>('/stats/records'),
    serverFetch<Player[]>('/players?includeArchived=true'),
  ])
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <StatsExplorer records={records} players={players} />
    </div>
  )
}
