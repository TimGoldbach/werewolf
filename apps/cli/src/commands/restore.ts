import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import * as p from '@clack/prompts'
import { requireInstance } from '../instance.ts'
import { importBackup, isBackupFile, listBackups } from '../lib/backups.ts'
import { CancelledError, CliError } from '../lib/errors.ts'
import { resolveUserPath } from '../lib/logo.ts'
import { paths } from '../lib/paths.ts'
import { pc } from '../lib/ui.ts'
import { describeBackup, replaceDatabase, shownPath, takeBackup } from '../maintenance.ts'
import { confirm, unwrap } from '../questions.ts'
import { type Command, type Context, stringFlag, yesOption } from './types.ts'

export const restore: Command = {
  name: 'restore',
  group: 'maintenance',
  summary: (m) => m.commands.restore,
  args: '[file]',
  options: [
    { name: 'file', type: 'string', value: '<file>', description: (m) => m.flags.file },
    yesOption,
  ],
  examples: ['restore', 'restore --file instance/backups/manual-20261029-081500.sql.gz --yes'],
  asks: true,
  async run(ctx) {
    const env = requireInstance(ctx)
    p.intro(pc.inverse(' werewolf restore '))

    const file = await chooseFile(ctx)
    const name = importBackup(file, paths.backups)
    p.log.warn(ctx.m.restore.overwrites(name))
    if (ctx.interactive && !(await confirm(ctx, ctx.m.restore.confirm, false))) {
      throw new CancelledError()
    }

    const safety = await takeBackup(ctx, env, 'pre-restore')
    await replaceDatabase(ctx, name, safety.name)
    p.outro(ctx.m.restore.done(shownPath(safety.path)))
  },
}

/** The file from --file or the argument, or one picked from instance/backups. */
async function chooseFile(ctx: Context): Promise<string> {
  const given = stringFlag(ctx, 'file') ?? ctx.positionals[0]
  if (given !== undefined) {
    // A bare name refers to instance/backups.
    const inBackups = join(paths.backups, given)
    const path = !given.includes('/') && existsSync(inBackups) ? inBackups : resolveUserPath(given)
    if (!existsSync(path) || !statSync(path).isFile()) {
      throw new CliError(ctx.m.restore.notFound(given))
    }
    if (!isBackupFile(path)) throw new CliError(ctx.m.restore.notABackup(given))
    return path
  }

  const backups = listBackups(paths.backups)
  if (backups.length === 0) throw new CliError(ctx.m.restore.none(shownPath(paths.backups)))
  if (!ctx.interactive) throw new CliError(ctx.m.missingFlag('file'))
  return unwrap(
    await p.select({
      message: ctx.m.restore.pick,
      options: backups.map((backup) => ({
        value: backup.path,
        label: describeBackup(ctx, backup),
        hint: backup.name,
      })),
      maxItems: 10,
    }),
  )
}
