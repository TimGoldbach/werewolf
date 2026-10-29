// Release tags (release-please: v1.2.3) and the parts of CHANGELOG.md between two of them.

export interface Version {
  major: number
  minor: number
  patch: number
  /** Pre-release identifiers, e.g. ["rc", "1"] for v1.0.0-rc.1. */
  pre: string[]
}

const SEMVER = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/

export function parseVersion(text: string): Version | undefined {
  const match = SEMVER.exec(text.trim())
  if (!match) return undefined
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    pre: match[4] ? match[4].split('.') : [],
  }
}

/** A final release tag like v1.2.3 (no pre-release suffix). */
export function isStableTag(tag: string): boolean {
  return /^v\d+\.\d+\.\d+$/.test(tag)
}

/** Semantic-version precedence: negative if a < b, 0 if equal, positive if a > b. */
export function compareVersions(a: Version, b: Version): number {
  for (const key of ['major', 'minor', 'patch'] as const) {
    if (a[key] !== b[key]) return a[key] - b[key]
  }
  // A pre-release sorts before its release.
  if (a.pre.length === 0 || b.pre.length === 0) return b.pre.length - a.pre.length
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    const x = a.pre[i]
    const y = b.pre[i]
    if (x === undefined) return -1
    if (y === undefined) return 1
    const xNum = /^\d+$/.test(x)
    const yNum = /^\d+$/.test(y)
    if (xNum && yNum && Number(x) !== Number(y)) return Number(x) - Number(y)
    if (xNum !== yNum) return xNum ? -1 : 1
    if (x !== y) return x < y ? -1 : 1
  }
  return 0
}

export function compareTags(a: string, b: string): number {
  const x = parseVersion(a)
  const y = parseVersion(b)
  if (!x || !y) return 0
  return compareVersions(x, y)
}

/** The newest final release among the tags (pre-releases and other tags are ignored). */
export function newestRelease(tags: string[]): string | undefined {
  return tags.filter(isStableTag).sort(compareTags).at(-1)
}

/** Tag names from `git ls-remote --tags` output (peeled "^{}" entries collapse into their tag). */
export function parseLsRemoteTags(output: string): string[] {
  const tags = new Set<string>()
  for (const line of output.split('\n')) {
    const ref = line.split('\t')[1]?.trim()
    if (ref?.startsWith('refs/tags/'))
      tags.add(ref.slice('refs/tags/'.length).replace(/\^\{\}$/, ''))
  }
  return [...tags]
}

// ── Changelog ────────────────────────────────────────────────────────────────

export interface ChangelogEntry {
  version: string
  date?: string
  body: string
}

/** "## [1.1.0](https://…/compare/v1.0.0...v1.1.0) (2026-11-02)" or "## 1.0.0 (2026-10-30)" */
const ENTRY_HEADING =
  /^##\s+\[?v?(\d+\.\d+\.\d+[0-9A-Za-z.+-]*)\]?(?:\([^)]*\))?\s*(?:\(([^)]+)\))?/

export function parseChangelog(markdown: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = []
  let current: { version: string; date?: string; lines: string[] } | undefined
  const flush = (): void => {
    if (current)
      entries.push({
        version: current.version,
        date: current.date,
        body: current.lines.join('\n').trim(),
      })
  }
  for (const line of markdown.split(/\r?\n/)) {
    const heading = ENTRY_HEADING.exec(line)
    if (heading) {
      flush()
      current = { version: heading[1], date: heading[2], lines: [] }
    } else if (current) {
      current.lines.push(line)
    }
  }
  flush()
  return entries
}

/**
 * Entries newer than `from` up to and including `to`, newest first. Without `from` (the
 * installed version is unknown) only the target's own entry is returned.
 */
export function changelogBetween(
  markdown: string,
  from: string | undefined,
  to: string,
): ChangelogEntry[] {
  const target = parseVersion(to)
  if (!target) return []
  const start = from ? parseVersion(from) : undefined
  return parseChangelog(markdown)
    .filter((entry) => {
      const version = parseVersion(entry.version)
      if (!version) return false
      if (!start) return compareVersions(version, target) === 0
      return compareVersions(version, start) > 0 && compareVersions(version, target) <= 0
    })
    .sort((a, b) => compareTags(b.version, a.version))
}

/** Plain text for the terminal: links reduced to their text, commit links dropped. */
export function simplifyChangelogLine(line: string): string {
  return line
    .replace(/\s*\(\[[0-9a-f]{7,40}\]\([^)]*\)\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\*\s+/, '• ')
    .trimEnd()
}
