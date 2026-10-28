import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { unstable_noStore as noStore } from 'next/cache'

/** Accent colour presets; each one is a `[data-accent]` block in globals.css. */
export const ACCENT_PRESETS = ['violet', 'blood', 'moon', 'forest', 'amber', 'silver'] as const
export type Accent = (typeof ACCENT_PRESETS)[number]

/** Path the instance logo is served from (see app/branding/logo/route.ts). */
export const LOGO_PATH = '/branding/logo'

// In order of preference: an SVG wins over a PNG.
const LOGO_FILES = [
  ['logo.svg', 'image/svg+xml'],
  ['logo.png', 'image/png'],
] as const

export interface Logo {
  file: string
  type: (typeof LOGO_FILES)[number][1]
  /** Changes whenever the file does; appended to the URL to bust caches. */
  version: string
  url: string
}

export interface Branding {
  /** `GROUP_NAME`, used in every language; null = translated default app name. */
  name: string | null
  /** `GROUP_TAGLINE` for the home hero; null = translated default tagline. */
  tagline: string | null
  accent: Accent
  logo: Logo | null
}

function envText(key: string): string | null {
  return process.env[key]?.trim() || null
}

function isAccent(value: string | undefined): value is Accent {
  return (ACCENT_PRESETS as readonly string[]).includes(value ?? '')
}

/** Directory with `logo.svg` or `logo.png`; the web container mounts instance/branding there. */
function brandingDir(): string {
  return process.env.BRANDING_DIR || '/app/branding'
}

/** The instance logo, if one exists. */
export function findLogo(): Logo | null {
  for (const [name, type] of LOGO_FILES) {
    const file = path.join(brandingDir(), name)
    try {
      const stat = statSync(file)
      if (!stat.isFile()) continue
      const version = `${Math.round(stat.mtimeMs).toString(36)}-${stat.size.toString(36)}`
      return { file, type, version, url: `${LOGO_PATH}?v=${version}` }
    } catch {
      // missing file or directory – try the next one
    }
  }
  return null
}

/** Width x height of a PNG from its IHDR chunk, for the manifest's `sizes`; null if it is no PNG. */
export function pngSize(file: string): string | null {
  try {
    const head = readFileSync(file).subarray(0, 24)
    if (head.length < 24 || head.toString('latin1', 12, 16) !== 'IHDR') return null
    return `${head.readUInt32BE(16)}x${head.readUInt32BE(20)}`
  } catch {
    return null
  }
}

/**
 * Per-instance branding from the web container's environment (`GROUP_NAME`, `GROUP_TAGLINE`,
 * `ACCENT_COLOR`) and the mounted logo. Read at request time — noStore() keeps Next from baking
 * build-time values into prerendered output, so one image serves every instance.
 */
export function getBranding(): Branding {
  noStore()
  const accent = process.env.ACCENT_COLOR?.trim().toLowerCase()
  return {
    name: envText('GROUP_NAME'),
    tagline: envText('GROUP_TAGLINE'),
    accent: isAccent(accent) ? accent : 'violet',
    logo: findLogo(),
  }
}
