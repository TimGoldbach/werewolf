import { readFile } from 'node:fs/promises'
import type { NextRequest } from 'next/server'
import { findLogo } from '@/lib/branding'

export const dynamic = 'force-dynamic'

/**
 * Serves the instance logo from the mounted branding directory. Links carry `?v=<version>`, so a
 * matching request may be cached for good; anything else revalidates against the ETag.
 */
export async function GET(req: NextRequest) {
  const logo = findLogo()
  if (!logo) return new Response(null, { status: 404 })

  const etag = `"${logo.version}"`
  const headers = {
    'Content-Type': logo.type,
    'Cache-Control':
      req.nextUrl.searchParams.get('v') === logo.version
        ? 'public, max-age=31536000, immutable'
        : 'no-cache',
    ETag: etag,
    'X-Content-Type-Options': 'nosniff',
    // An SVG opened directly must not run scripts on this origin.
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  }
  if (req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers })

  try {
    return new Response(await readFile(logo.file), { headers })
  } catch {
    return new Response(null, { status: 404 })
  }
}
