/**
 * Event-sourcing envelope. The full event union + reducer + command handler
 * (capability engine) arrives in phase 2; this is only the persistence envelope so
 * the API can store events generically.
 */
export interface GameEventEnvelope<T = unknown> {
  /** consecutive, gapless sequence number within a game */
  seq: number
  type: string
  /** ISO timestamp */
  at: string
  payload: T
}

export type GameEventInput<T = unknown> = Omit<GameEventEnvelope<T>, 'seq' | 'at'> & {
  at?: string
}
