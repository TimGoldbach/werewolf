import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * Target for an invalid session (e.g. signed with an old SESSION_SECRET, or expired): delete the cookie,
 * then go to /login. Going straight to /login wouldn't work – the middleware sends everyone with a cookie back to /.
 */
export function GET() {
  cookies().delete(SESSION_COOKIE)
  redirect('/login')
}
