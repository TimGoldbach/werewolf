import * as p from '@clack/prompts'
import { composeUp, instanceUrls, requireInstance } from '../instance.ts'
import { compose } from '../lib/docker.ts'
import { CliError } from '../lib/errors.ts'
import { tail } from '../lib/proc.ts'
import { spinner } from '../lib/progress.ts'
import { settingsFromEnv } from '../lib/settings.ts'
import { cmd, pc } from '../lib/ui.ts'
import type { Command, Context } from './types.ts'

function printUrl(ctx: Context): void {
  const { open } = instanceUrls(settingsFromEnv(requireInstance(ctx)))
  p.outro(open ? pc.cyan(open) : undefined)
}

export const start: Command = {
  name: 'start',
  group: 'run',
  summary: (m) => m.commands.start,
  options: [],
  async run(ctx) {
    requireInstance(ctx)
    p.intro(pc.inverse(' werewolf start '))
    await composeUp(ctx, { start: ctx.m.lifecycle.starting, done: ctx.m.lifecycle.started })
    printUrl(ctx)
  },
}

export const stop: Command = {
  name: 'stop',
  group: 'run',
  summary: (m) => m.commands.stop,
  options: [],
  async run(ctx) {
    requireInstance(ctx)
    p.intro(pc.inverse(' werewolf stop '))
    const spin = spinner()
    spin.start(ctx.m.lifecycle.stopping)
    const result = await compose(['stop'])
    if (result.code !== 0) {
      spin.error(ctx.m.lifecycle.failed)
      throw new CliError(ctx.m.lifecycle.failed, tail(result.output))
    }
    spin.stop(ctx.m.lifecycle.containersStopped)
    p.outro(`${ctx.m.lifecycle.stopped} ${cmd(`${ctx.bin} start`)}`)
  },
}

export const restart: Command = {
  name: 'restart',
  group: 'run',
  summary: (m) => m.commands.restart,
  options: [],
  async run(ctx) {
    requireInstance(ctx)
    p.intro(pc.inverse(' werewolf restart '))
    // Recreating (not just restarting) picks up edits to instance/.env.
    await composeUp(ctx, { start: ctx.m.lifecycle.restarting, done: ctx.m.lifecycle.restarted }, [
      '--force-recreate',
    ])
    printUrl(ctx)
  },
}
