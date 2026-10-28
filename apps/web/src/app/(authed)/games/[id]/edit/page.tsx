import type { Player } from '@werewolf/shared'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { QuickGameForm } from '@/components/quick-game-form'
import { Card, CardContent } from '@/components/ui/card'
import { gameToPrefill } from '@/lib/game-prefill'
import { ApiError, fetchHiddenRoleIds, serverFetch } from '@/lib/server-api'
import { buildSetupHints } from '@/lib/setup-hints'
import type { GameListItem } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function EditGamePage({ params }: { params: { id: string } }) {
  const t = await getTranslations('games.edit')
  let game: GameListItem
  try {
    game = await serverFetch<GameListItem>(`/games/${params.id}`)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound()
    throw e
  }
  // Roles this game was played with stay selectable even if the group has hidden them since.
  const gameRoles = new Set(game.players.map((p) => p.roleId))
  const hiddenRoleIds = (await fetchHiddenRoleIds()).filter((id) => !gameRoles.has(id))

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/games/${game.id}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        {t('back')}
      </Link>
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      {game.status !== 'FINISHED' ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            {t('stillRunning')}
          </CardContent>
        </Card>
      ) : (
        <QuickGameForm
          // incl. archived players, so earlier participants/moderators show up by name
          players={await serverFetch<Player[]>('/players?includeArchived=true')}
          initial={gameToPrefill(game, { forEdit: true })}
          editGameId={game.id}
          hints={buildSetupHints(await serverFetch<GameListItem[]>('/games'), hiddenRoleIds)}
          hiddenRoleIds={hiddenRoleIds}
        />
      )}
    </div>
  )
}
