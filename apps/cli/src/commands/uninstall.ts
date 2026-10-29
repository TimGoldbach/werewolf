import * as p from '@clack/prompts'
import { requireInstance } from '../instance.ts'
import { compose } from '../lib/docker.ts'
import { CancelledError, CliError } from '../lib/errors.ts'
import { paths } from '../lib/paths.ts'
import { tail } from '../lib/proc.ts'
import { spinner } from '../lib/progress.ts'
import { cmd, pc } from '../lib/ui.ts'
import { shownPath, takeBackup } from '../maintenance.ts'
import { confirm } from '../questions.ts'
import { type Command, yesOption } from './types.ts'

export const uninstall: Command = {
  name: 'uninstall',
  group: 'maintenance',
  summary: (m) => m.commands.uninstall,
  options: [yesOption],
  examples: ['uninstall', 'uninstall --yes'],
  asks: true,
  async run(ctx) {
    const env = requireInstance(ctx)
    p.intro(pc.inverse(' werewolf uninstall '))
    p.log.warn(ctx.m.uninstall.what(shownPath(paths.instance)))
    if (ctx.interactive && !(await confirm(ctx, ctx.m.uninstall.confirm, false))) {
      throw new CancelledError()
    }

    // Without a backup nothing is removed.
    const backup = await takeBackup(ctx, env, 'pre-uninstall')

    const spin = spinner()
    spin.start(ctx.m.uninstall.removing)
    const down = await compose(['down', '--volumes', '--remove-orphans'])
    if (down.code !== 0) {
      spin.error(ctx.m.lifecycle.failed)
      throw new CliError(ctx.m.lifecycle.failed, tail(down.output))
    }
    spin.stop(ctx.m.uninstall.removed)

    const restore = `${ctx.bin} restore --file ${shownPath(backup.path)}`
    p.log.info(`${ctx.m.uninstall.kept}: ${shownPath(paths.instance)}/`)
    p.log.message(`${ctx.m.uninstall.reinstall}:\n${cmd(`${ctx.bin} start`)}\n${cmd(restore)}`)
    p.log.message(`${ctx.m.uninstall.removeAll}:\n${cmd(`rm -rf ${paths.root}`)}`)
    p.outro(ctx.m.uninstall.done)
  },
}
