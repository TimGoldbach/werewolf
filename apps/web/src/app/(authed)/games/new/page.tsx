import type { Player, SetSuggestion } from '@werewolf/shared'
import { getTranslations } from 'next-intl/server'
import { QuickGameForm } from '@/components/quick-game-form'
import { gameToPrefill, type GameFormPrefill } from '@/lib/game-prefill'
import { fetchHiddenRoleIds, serverFetch } from '@/lib/server-api'
import { buildSetupHints } from '@/lib/setup-hints'
import type { GameListItem } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function NewGamePage({
  searchParams,
}: {
  searchParams: { copy?: string | string[] }
}) {
  const t = await getTranslations('games.new')
  // "Copy": prefill the form with the same people + roles (the outcome stays empty).
  const copyId = typeof searchParams.copy === 'string' ? searchParams.copy : undefined
  // For a copy, load archived players too, so earlier participants show up by name.
  const [players, setSuggestions, games, hiddenRoleIds] = await Promise.all([
    serverFetch<Player[]>(copyId ? '/players?includeArchived=true' : '/players'),
    // Set suggestions are a convenience: if the query fails, the form stays fully usable.
    serverFetch<SetSuggestion[]>('/stats/set-suggestions').catch((): SetSuggestion[] => []),
    // History for the shortcuts (regular players, "same as last time", popular roles) — also a convenience.
    serverFetch<GameListItem[]>('/games').catch((): GameListItem[] => []),
    fetchHiddenRoleIds(),
  ])
  let initial: GameFormPrefill | undefined
  if (copyId) {
    try {
      const src = await serverFetch<GameListItem>(`/games/${copyId}`)
      initial = gameToPrefill(src, { forEdit: false })
    } catch {
      // invalid/missing copy id → normal empty form
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{initial ? t('titleCopy') : t('titleRecord')}</h1>
      <QuickGameForm
        players={players}
        initial={initial}
        setSuggestions={setSuggestions}
        hints={buildSetupHints(games, hiddenRoleIds)}
        hiddenRoleIds={hiddenRoleIds}
      />
    </div>
  )
}
