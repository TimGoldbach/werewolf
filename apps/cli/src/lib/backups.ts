// Database backups in instance/backups: listing, and dumps/restores through the compose
// `backup` service, which has the database credentials and the directory mounted at /backups.

import { copyFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { compose, isServiceRunning } from './docker.ts'
import type { EnvValues } from './env-file.ts'
import type { RunResult } from './proc.ts'
import { DEFAULT_RETENTION_DAYS } from './settings.ts'

export type BackupKind =
  | 'nightly'
  | 'manual'
  | 'pre-update'
  | 'pre-restore'
  | 'pre-uninstall'
  | 'other'

/** Backups the CLI makes itself, named `<kind>-YYYYMMDD-HHMMSS.sql.gz` (UTC). */
export type CreatedKind = Exclude<BackupKind, 'nightly' | 'other'>

const PREFIXES: [string, BackupKind][] = [
  ['werewolf-', 'nightly'],
  ['manual-', 'manual'],
  ['pre-update-', 'pre-update'],
  ['pre-restore-', 'pre-restore'],
  ['pre-uninstall-', 'pre-uninstall'],
]

export interface Backup {
  name: string
  path: string
  kind: BackupKind
  size: number
  mtime: number
}

export function isBackupFile(name: string): boolean {
  return /\.sql(\.gz)?$/.test(name)
}

export function backupKind(name: string): BackupKind {
  return PREFIXES.find(([prefix]) => name.startsWith(prefix))?.[1] ?? 'other'
}

/** UTC timestamp as in the nightly file names, e.g. 20261029-081500. */
export function timestamp(date = new Date()): string {
  return date.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15)
}

export function backupName(kind: CreatedKind, date = new Date()): string {
  return `${kind}-${timestamp(date)}.sql.gz`
}

/** All backups, newest first. */
export function listBackups(dir: string): Backup[] {
  let names: string[]
  try {
    names = readdirSync(dir)
  } catch {
    return []
  }
  return names
    .filter(isBackupFile)
    .map((name) => {
      const path = join(dir, name)
      const stat = statSync(path)
      return { name, path, kind: backupKind(name), size: stat.size, mtime: stat.mtimeMs }
    })
    .sort((a, b) => b.mtime - a.mtime || b.name.localeCompare(a.name))
}

export function retentionDays(env: EnvValues): number {
  const days = Number.parseInt(env.BACKUP_RETENTION_DAYS ?? '', 10)
  return Number.isInteger(days) && days > 0 ? days : DEFAULT_RETENTION_DAYS
}

/** Names that are safe to hand to the shell inside the backup container. */
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

/**
 * Makes a file usable for a restore: backups already in the directory are used as they are,
 * others are copied in (the container only sees instance/backups).
 */
export function importBackup(file: string, dir: string): string {
  const path = resolve(file)
  if (resolve(dirname(path)) === resolve(dir) && SAFE_NAME.test(basename(path)))
    return basename(path)
  const cleaned = basename(path)
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .replace(/^[._-]+/, '')
  const name = `imported-${timestamp()}-${cleaned}`
  copyFileSync(path, join(dir, name))
  return name
}

/** Compose's own progress lines ("Container x Running") around a `run`. */
const COMPOSE_PROGRESS = /^\s*(Container|Network|Volume) \S+ +\w+\s*$/

async function inBackupContainer(script: string): Promise<RunResult> {
  const result = await compose([
    'run',
    '--rm',
    '--no-TTY',
    '--entrypoint',
    'sh',
    'backup',
    '-c',
    script,
  ])
  const output = result.output
    .split('\n')
    .filter((line) => !COMPOSE_PROGRESS.test(line))
    .join('\n')
  return { ...result, output }
}

/**
 * Dumps the database into instance/backups and applies the retention to all backups there.
 * Starts the database for the dump if it is not running, and stops it again afterwards.
 */
export async function createBackup(
  kind: CreatedKind,
  env: EnvValues,
): Promise<{ result: RunResult; name: string }> {
  const name = backupName(kind)
  const script = [
    'set -eu -o pipefail',
    `f=/backups/${name}`,
    'pg_dump | gzip > "$f.partial"',
    'mv "$f.partial" "$f"',
    `find /backups -name '*.sql.gz' -mtime +${retentionDays(env)} -delete`,
  ].join('\n')
  const dbWasRunning = await isServiceRunning('db')
  const result = await inBackupContainer(script)
  if (!dbWasRunning) await compose(['stop', 'db'])
  return { result, name }
}

/**
 * Replaces the database with the dump in instance/backups/<name>. The API must be stopped;
 * the database is dropped and created again, so plain and --clean dumps both work.
 */
export function restoreBackup(name: string): Promise<RunResult> {
  if (!SAFE_NAME.test(name)) throw new Error(`Unexpected backup file name: ${name}`)
  const read = name.endsWith('.gz') ? 'gunzip -c' : 'cat'
  const script = [
    'set -eu -o pipefail',
    `test -s /backups/${name}`,
    'psql -v ON_ERROR_STOP=1 -q -d postgres \\',
    '  -c "DROP DATABASE IF EXISTS \\"$PGDATABASE\\" WITH (FORCE)" \\',
    '  -c "CREATE DATABASE \\"$PGDATABASE\\""',
    `${read} /backups/${name} | psql -v ON_ERROR_STOP=1 -q -o /dev/null -d "$PGDATABASE"`,
  ].join('\n')
  return inBackupContainer(script)
}
