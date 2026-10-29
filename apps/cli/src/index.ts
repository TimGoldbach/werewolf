// Entry point of the werewolf CLI. Started by the ./werewolf launcher, which makes sure a
// recent Node (native TypeScript) and the CLI's dependencies are there.

import { delimiter, dirname, resolve } from 'node:path'
import { type ParseArgsConfig, parseArgs } from 'node:util'
import * as p from '@clack/prompts'
import { findCommand } from './commands/index.ts'
import type { Context, Flags, OptionSpec } from './commands/types.ts'
import { globalOptions, renderCommandHelp, renderHelp } from './help.ts'
import { type Messages, messages, systemLocale } from './i18n/index.ts'
import { readInstanceEnv } from './lib/docker.ts'
import { CancelledError, CliError } from './lib/errors.ts'
import { localizePrompts } from './lib/prompt-locale.ts'
import { type Locale, isLocale } from './lib/settings.ts'
import { pc } from './lib/ui.ts'
import { cliVersion } from './version.ts'

/** How the user invoked us: "werewolf" via PATH, otherwise the path as typed (./werewolf). */
function invokedAs(): string {
  const argv0 = process.env.WEREWOLF_ARGV0
  if (!argv0) return './werewolf'
  if (!argv0.includes('/')) return argv0
  const dir = resolve(dirname(argv0))
  const onPath = (process.env.PATH ?? '')
    .split(delimiter)
    .some((entry) => entry && resolve(entry) === dir)
  return onPath ? 'werewolf' : argv0
}

/** The command is the first argument that is neither an option nor the value of --lang. */
function splitCommand(argv: string[]): { name?: string; rest: string[] } {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--lang') {
      i++
      continue
    }
    if (!arg.startsWith('-'))
      return { name: arg, rest: [...argv.slice(0, i), ...argv.slice(i + 1)] }
  }
  return { rest: argv }
}

function parse(
  args: string[],
  options: OptionSpec[],
  allowPositionals: boolean,
  ctx: Context,
): void {
  const config: ParseArgsConfig['options'] = {}
  for (const option of options) {
    config[option.name] = option.short
      ? { type: option.type, short: option.short }
      : { type: option.type }
  }
  try {
    const parsed = parseArgs({ args, options: config, strict: true, allowPositionals })
    ctx.flags = parsed.values as Flags
    ctx.positionals = parsed.positionals
  } catch (error) {
    throw new CliError((error as Error).message, ctx.m.common.seeHelp(ctx.bin))
  }
}

function initialLocale(argv: string[]): Locale {
  const index = argv.indexOf('--lang')
  const flag =
    index >= 0 ? argv[index + 1] : argv.find((arg) => arg.startsWith('--lang='))?.slice(7)
  if (flag && isLocale(flag)) return flag
  const configured = readInstanceEnv()?.DEFAULT_LOCALE
  if (configured && isLocale(configured)) return configured
  return systemLocale()
}

function createContext(argv: string[]): Context {
  const locale = initialLocale(argv)
  const ctx: Context = {
    m: messages[locale],
    locale,
    bin: invokedAs(),
    interactive: false,
    flags: {},
    positionals: [],
    setLocale(next) {
      ctx.locale = next
      ctx.m = messages[next]
      localizePrompts(ctx.m)
    },
  }
  localizePrompts(ctx.m)
  return ctx
}

async function main(argv: string[], ctx: Context): Promise<number> {
  const { name, rest } = splitCommand(argv)
  if (!name) {
    parse(rest, globalOptions, false, ctx)
    if (ctx.flags.version) {
      process.stdout.write(`werewolf ${cliVersion()}\n`)
      return 0
    }
    process.stdout.write(renderHelp(ctx))
    return 0
  }

  const command = findCommand(name)
  if (!command) {
    throw new CliError(ctx.m.common.unknownCommand(name), ctx.m.common.seeHelp(ctx.bin))
  }
  // Commands own --lang where it is a setting (setup, config); everywhere else it is global.
  const own = new Set(command.options.map((option) => option.name))
  const options = [...command.options, ...globalOptions.filter((option) => !own.has(option.name))]
  parse(rest, options, command.args !== undefined, ctx)
  if (ctx.flags.help) {
    process.stdout.write(renderCommandHelp(ctx, command))
    return 0
  }

  const yes = ctx.flags.yes === true
  const terminal = Boolean(process.stdin.isTTY && process.stdout.isTTY)
  ctx.interactive = !yes && terminal
  if (command.asks && !yes && !terminal) throw new CliError(ctx.m.common.noTerminal)

  return (await command.run(ctx)) ?? 0
}

function report(error: unknown, m: Messages): number {
  if (error instanceof CancelledError) {
    p.cancel(m.common.cancelled)
    return 130
  }
  if (error instanceof CliError) {
    p.log.error(error.message)
    if (error.hint) p.log.message(pc.dim(error.hint))
    return error.exitCode
  }
  p.log.error(
    `${m.common.unexpected}: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
  )
  return 1
}

const argv = process.argv.slice(2)
const ctx = createContext(argv)
try {
  process.exitCode = await main(argv, ctx)
} catch (error) {
  // ctx.m follows a language picked during the run.
  process.exitCode = report(error, ctx.m)
}
