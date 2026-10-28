import { statfsSync } from 'node:fs'
import { paths } from './paths.ts'
import { run } from './proc.ts'

export type CheckStatus = 'ok' | 'warn' | 'fail'
export type CheckId = 'docker' | 'compose' | 'git' | 'arch' | 'disk'
export type CheckReason = 'missing' | 'daemon' | 'permission' | 'tooOld' | 'unsupported' | 'low'

export interface Check {
  id: CheckId
  status: CheckStatus
  /** Version, architecture or free space, shown next to the check. */
  value?: string
  reason?: CheckReason
}

export const GIB = 1024 ** 3
/** Building the images needs considerably more room than pulling them. */
const DISK_MIN = 2 * GIB
const DISK_RECOMMENDED = 5 * GIB

export async function checkDocker(): Promise<Check> {
  const result = await run('docker', ['version', '--format', '{{.Server.Version}}'])
  if (result.code === 0) return { id: 'docker', status: 'ok', value: result.stdout.trim() }
  if (result.code === 127) return { id: 'docker', status: 'fail', reason: 'missing' }
  const reason = /permission denied/i.test(result.output) ? 'permission' : 'daemon'
  return { id: 'docker', status: 'fail', reason }
}

export async function checkCompose(): Promise<Check> {
  const result = await run('docker', ['compose', 'version', '--short'])
  const version = result.stdout.trim().replace(/^v/, '')
  if (result.code !== 0 || !version) return { id: 'compose', status: 'fail', reason: 'missing' }
  const major = Number.parseInt(version, 10)
  if (major < 2) return { id: 'compose', status: 'fail', value: version, reason: 'tooOld' }
  return { id: 'compose', status: 'ok', value: version }
}

export async function checkGit(): Promise<Check> {
  const result = await run('git', ['--version'])
  if (result.code !== 0) return { id: 'git', status: 'warn', reason: 'missing' }
  return { id: 'git', status: 'ok', value: result.stdout.trim().replace(/^git version /, '') }
}

/** Release images exist for amd64 and arm64; anything else has to build locally. */
export function checkArch(arch: string = process.arch): Check {
  const name = arch === 'x64' ? 'amd64' : arch
  if (name === 'amd64' || name === 'arm64') return { id: 'arch', status: 'ok', value: name }
  return { id: 'arch', status: 'warn', value: name, reason: 'unsupported' }
}

export function checkDisk(path: string = paths.root): Check {
  try {
    const stats = statfsSync(path)
    const free = stats.bavail * stats.bsize
    const value = formatBytes(free)
    if (free < DISK_MIN) return { id: 'disk', status: 'fail', value, reason: 'low' }
    if (free < DISK_RECOMMENDED) return { id: 'disk', status: 'warn', value, reason: 'low' }
    return { id: 'disk', status: 'ok', value }
  } catch {
    return { id: 'disk', status: 'warn' }
  }
}

export async function systemChecks(): Promise<Check[]> {
  const docker = await checkDocker()
  // Compose needs a working docker CLI; without one its check would only repeat the error.
  const compose: Check =
    docker.reason === 'missing'
      ? { id: 'compose', status: 'fail', reason: 'missing' }
      : await checkCompose()
  return [docker, compose, await checkGit(), checkArch(), checkDisk()]
}

export function formatBytes(bytes: number): string {
  if (bytes >= GIB) return `${(bytes / GIB).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}
