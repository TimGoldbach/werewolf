import { readFileSync, writeFileSync } from 'node:fs'
import * as p from '@clack/prompts'
import { composeUp, requireInstance } from '../instance.ts'
import { isServiceRunning } from '../lib/docker.ts'
import { updateEnv } from '../lib/env-file.ts'
import { CancelledError } from '../lib/errors.ts'
import { generateSecret, hashPassword } from '../lib/password.ts'
import { paths } from '../lib/paths.ts'
import { ACCENTS, settingsFromEnv } from '../lib/settings.ts'
import { hex, keyValues, pc } from '../lib/ui.ts'
import { askPassword, confirm } from '../questions.ts'
import { type Command, passwordOptions, yesOption } from './types.ts'

export const password: Command = {
  name: 'password',
  group: 'setup',
  summary: (m) => m.commands.password,
  options: [...passwordOptions, yesOption],
  examples: [
    'password',
    'password --generate-password --yes',
    'password --password "new secret phrase" --yes',
  ],
  asks: true,
  async run(ctx) {
    const env = requireInstance(ctx)
    const settings = settingsFromEnv(env)
    p.intro(pc.inverse(' werewolf password '))
    p.log.info(ctx.m.password.intro)

    const answer = await askPassword(ctx)
    if (ctx.interactive && !(await confirm(ctx, ctx.m.password.confirm))) {
      throw new CancelledError()
    }

    // A new SESSION_SECRET invalidates every issued session token.
    const updates = {
      GATE_PASSWORD: '',
      GATE_PASSWORD_HASH: await hashPassword(answer.password),
      SESSION_SECRET: generateSecret(48),
    }
    writeFileSync(paths.env, updateEnv(readFileSync(paths.env, 'utf8'), updates), { mode: 0o600 })
    p.log.success(ctx.m.password.saved)

    if (await isServiceRunning('api')) {
      await composeUp(ctx, { start: ctx.m.password.restarting, done: ctx.m.password.restarted }, [
        'api',
      ])
    } else {
      p.log.info(ctx.m.password.notRunning)
    }

    p.box(
      keyValues([
        [
          ctx.m.password.newPassword,
          `${pc.bold(answer.password)}\n${pc.dim(ctx.m.setup.passwordOnce)}`,
        ],
      ]),
      ` ${settings.groupName || 'werewolf'} `,
      { formatBorder: hex(ACCENTS[settings.accent]), contentPadding: 2 },
    )
    p.outro()
  },
}
