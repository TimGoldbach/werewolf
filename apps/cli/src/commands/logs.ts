import { requireInstance } from '../instance.ts'
import { composeInteractive } from '../lib/docker.ts'
import { CliError } from '../lib/errors.ts'
import { type Command, booleanFlag, stringFlag } from './types.ts'

const SERVICES = ['web', 'api', 'db', 'backup', 'caddy']
const DEFAULT_SERVICES = ['web', 'api']

export const logs: Command = {
  name: 'logs',
  group: 'run',
  summary: (m) => m.commands.logs,
  args: '[web|api|db|backup|caddy|all…]',
  options: [
    { name: 'follow', short: 'f', type: 'boolean', description: (m) => m.flags.follow },
    {
      name: 'tail',
      short: 'n',
      type: 'string',
      value: '<lines>',
      description: (m) => m.flags.tail,
    },
  ],
  examples: ['logs', 'logs -f api', 'logs --tail 500 all'],
  async run(ctx) {
    requireInstance(ctx)
    const requested = ctx.positionals.length > 0 ? ctx.positionals : DEFAULT_SERVICES
    for (const name of requested) {
      if (name !== 'all' && !SERVICES.includes(name)) {
        throw new CliError(ctx.m.logs.unknownService(name, [...SERVICES, 'all'].join(', ')))
      }
    }
    const services = requested.includes('all') ? [] : requested
    const lines = stringFlag(ctx, 'tail') ?? '100'
    const args = ['logs', '--tail', lines]
    if (booleanFlag(ctx, 'follow')) args.push('--follow')
    const code = await composeInteractive([...args, ...services])
    // Ending `logs -f` with Ctrl+C is the normal way out, not an error.
    return code === 130 ? 0 : code
  },
}
