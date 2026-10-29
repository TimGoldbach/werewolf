import { notFound } from 'next/navigation'
import { LiveConsole } from '@/components/live-console'
import { ApiError, serverFetch } from '@/lib/server-api'
import type { LiveState } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function LiveGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let state: LiveState
  try {
    state = await serverFetch<LiveState>(`/games/${id}/state`)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound()
    throw e
  }
  return <LiveConsole initial={state} />
}
