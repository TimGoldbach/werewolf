import { lstatSync, mkdirSync, realpathSync, symlinkSync, unlinkSync } from 'node:fs'
import { delimiter, join } from 'node:path'
import * as p from '@clack/prompts'
import { CliError } from '../lib/errors.ts'
import { resolveUserPath } from '../lib/logo.ts'
import { paths } from '../lib/paths.ts'
import { cmd } from '../lib/ui.ts'
import { type Command, booleanFlag, forceOption, stringFlag } from './types.ts'

const DEFAULT_DIR = '~/.local/bin'

export const link: Command = {
  name: 'link',
  group: 'other',
  summary: (m) => m.commands.link,
  options: [
    { name: 'dir', type: 'string', value: '<dir>', description: (m) => m.flags.linkDir },
    { name: 'remove', type: 'boolean', description: (m) => m.flags.linkRemove },
    forceOption,
  ],
  examples: ['link', 'link --dir /usr/local/bin', 'link --remove'],
  async run(ctx) {
    const dir = resolveUserPath(stringFlag(ctx, 'dir') ?? DEFAULT_DIR)
    const target = join(dir, 'werewolf')

    if (booleanFlag(ctx, 'remove')) {
      if (pointsHere(target)) {
        unlinkSync(target)
        p.log.success(ctx.m.link.removed(target))
      } else {
        p.log.info(ctx.m.link.nothingToRemove(target))
      }
      return
    }

    if (!pointsHere(target)) {
      if (exists(target)) {
        if (!booleanFlag(ctx, 'force'))
          throw new CliError(ctx.m.link.exists(target), cmd(`${ctx.bin} link --force`))
        unlinkSync(target)
      }
      mkdirSync(dir, { recursive: true })
      symlinkSync(paths.launcher, target)
    }
    p.log.success(ctx.m.link.created(`${target} → ${paths.launcher}`))

    const onPath = (process.env.PATH ?? '').split(delimiter).some((entry) => sameDir(entry, dir))
    if (!onPath) {
      const shown = dir.startsWith(process.env.HOME ?? '\0')
        ? dir.replace(process.env.HOME as string, '$HOME')
        : dir
      p.log.warn(`${ctx.m.link.notOnPath(dir)}\n${cmd(`export PATH="${shown}:$PATH"`)}`)
    }
    p.log.message(`${ctx.m.link.usage} ${cmd('werewolf status')}`)
  },
}

function exists(path: string): boolean {
  try {
    lstatSync(path)
    return true
  } catch {
    return false
  }
}

function pointsHere(path: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink() && realpathSync(path) === realpathSync(paths.launcher)
  } catch {
    return false
  }
}

function sameDir(a: string, b: string): boolean {
  try {
    return realpathSync(a) === realpathSync(b)
  } catch {
    return a.replace(/\/$/, '') === b.replace(/\/$/, '')
  }
}
