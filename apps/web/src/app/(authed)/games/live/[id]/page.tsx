import { notFound } from 'next/navigation'
import { LiveConsole } from '@/components/live-console'
import { ApiError, serverFetch } from '@/lib/server-api'
import type { LiveState } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function LiveGamePage({ params }: { params: { id: string } }) {
  let state: LiveState
  try {
    state = await serverFetch<LiveState>(`/games/${params.id}/state`)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound()
    throw e
  }
  return <LiveConsole initial={state} />
}
