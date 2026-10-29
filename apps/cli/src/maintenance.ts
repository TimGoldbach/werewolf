// Steps shared by backup, restore, update and uninstall.

import { relative } from 'node:path'
import type { Context } from './commands/types.ts'
import { checkHealth, composeUp } from './instance.ts'
import {
  type Backup,
  type CreatedKind,
  createBackup,
  listBackups,
  restoreBackup,
} from './lib/backups.ts'
import { compose, readInstanceEnv } from './lib/docker.ts'
import type { EnvValues } from './lib/env-file.ts'
import { CliError } from './lib/errors.ts'
import { paths } from './lib/paths.ts'
import { tail } from './lib/proc.ts'
import { spinner } from './lib/progress.ts'
import { settingsFromEnv } from './lib/settings.ts'
import { formatBytes } from './lib/system.ts'

/** Path relative to the checkout, for messages. */
export function shownPath(path: string): string {
  return relative(process.cwd(), path) || path
}

/** "29.10.2026, 09:15 · manual · 12 KB" */
export function describeBackup(ctx: Context, backup: Backup): string {
  const date = new Date(backup.mtime).toLocaleString(ctx.locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  return `${date} · ${ctx.m.backups.kinds[backup.kind]} · ${formatBytes(backup.size)}`
}

/** Dumps the database with a spinner; any failure aborts the calling command. */
export async function takeBackup(ctx: Context, env: EnvValues, kind: CreatedKind): Promise<Backup> {
  const spin = spinner()
  spin.start(ctx.m.backups.creating)
  const { result, name } = await createBackup(kind, env)
  const backup = listBackups(paths.backups).find((b) => b.name === name)
  if (result.code !== 0 || !backup || backup.size === 0) {
    spin.error(ctx.m.backups.failed)
    throw new CliError(ctx.m.backups.failed, tail(result.output))
  }
  spin.stop(ctx.m.backups.created(shownPath(backup.path), formatBytes(backup.size)))
  return backup
}

/**
 * Replaces the database with a backup: stops the API, restores, starts everything again and
 * checks that the app answers. If the restore itself fails and a fallback is given (the
 * safety backup), that one is restored instead before the error is raised.
 */
export async function replaceDatabase(
  ctx: Context,
  name: string,
  fallback?: string,
): Promise<void> {
  const spin = spinner()
  spin.start(ctx.m.backups.stoppingApi)
  const stop = await compose(['stop', 'api'])
  const db = stop.code === 0 ? await compose(['up', '--detach', '--wait', 'db']) : stop
  if (db.code !== 0) {
    spin.error(ctx.m.lifecycle.failed)
    throw new CliError(ctx.m.lifecycle.failed, tail(db.output))
  }
  spin.stop(ctx.m.backups.apiStopped)

  const restoring = spinner()
  restoring.start(ctx.m.backups.restoring(name))
  const result = await restoreBackup(name)
  if (result.code !== 0) {
    restoring.error(ctx.m.backups.restoreFailed)
    let hint = tail(result.output)
    if (fallback) {
      const back = await restoreBackup(fallback)
      hint += `\n${back.code === 0 ? ctx.m.backups.fallbackRestored(fallback) : ctx.m.backups.fallbackFailed(fallback)}`
    }
    await composeUp(ctx, { start: ctx.m.lifecycle.starting, done: ctx.m.lifecycle.started })
    throw new CliError(ctx.m.backups.restoreFailed, hint)
  }
  restoring.stop(ctx.m.backups.restored(name))

  // The API applies the migrations of this version on start, also to an older backup.
  await composeUp(ctx, { start: ctx.m.lifecycle.starting, done: ctx.m.lifecycle.started })
  const env = readInstanceEnv()
  if (env) await checkHealth(ctx, settingsFromEnv(env))
}
