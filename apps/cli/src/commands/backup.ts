import * as p from '@clack/prompts'
import { requireInstance } from '../instance.ts'
import { retentionDays } from '../lib/backups.ts'
import { pc } from '../lib/ui.ts'
import { takeBackup } from '../maintenance.ts'
import type { Command } from './types.ts'

export const backup: Command = {
  name: 'backup',
  group: 'maintenance',
  summary: (m) => m.commands.backup,
  options: [],
  examples: ['backup'],
  async run(ctx) {
    const env = requireInstance(ctx)
    p.intro(pc.inverse(' werewolf backup '))
    await takeBackup(ctx, env, 'manual')
    p.outro(pc.dim(ctx.m.backups.retention(retentionDays(env))))
  },
}
