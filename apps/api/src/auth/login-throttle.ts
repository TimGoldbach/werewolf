import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { apiError } from '@werewolf/shared'

const MAX_FAILURES = 10
const WINDOW_MS = 15 * 60 * 1000

interface Bucket {
  failures: number
  resetAt: number
}

/**
 * Slows down guessing the shared group password: after MAX_FAILURES wrong passwords from
 * one client within WINDOW_MS, further attempts get 429 until the window ends.
 *
 * Keyed by `req.ip`. Behind the bundled Caddy (or any proxy that sets X-Forwarded-For)
 * that is the real client; in LAN mode the web container talks to the API directly, so
 * all devices share one bucket — acceptable at a table of friends.
 */
@Injectable()
export class LoginThrottle {
  private readonly buckets = new Map<string, Bucket>()

  constructor(private readonly now: () => number = Date.now) {}

  /** Throws 429 if this client is currently locked out. */
  check(client: string): void {
    const bucket = this.current(client)
    if (bucket && bucket.failures >= MAX_FAILURES) {
      const retryAfter = Math.ceil((bucket.resetAt - this.now()) / 1000)
      throw new HttpException(
        apiError('TOO_MANY_ATTEMPTS', 'Too many wrong passwords, try again later.', { retryAfter }),
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }
  }

  fail(client: string): void {
    const bucket = this.current(client) ?? { failures: 0, resetAt: this.now() + WINDOW_MS }
    bucket.failures++
    this.buckets.set(client, bucket)
  }

  succeed(client: string): void {
    this.buckets.delete(client)
  }

  private current(client: string): Bucket | undefined {
    const bucket = this.buckets.get(client)
    if (bucket && bucket.resetAt <= this.now()) {
      this.buckets.delete(client)
      return undefined
    }
    return bucket
  }
}
