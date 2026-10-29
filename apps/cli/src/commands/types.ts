import type { Messages } from '../i18n/index.ts'
import type { Locale } from '../lib/settings.ts'

export type Flags = Record<string, string | boolean | undefined>

export interface OptionSpec {
  /** Long name without dashes, e.g. "time-zone". */
  name: string
  short?: string
  type: 'string' | 'boolean'
  /** Placeholder for the value in the help, e.g. "<port>". */
  value?: string
  description: (m: Messages) => string
}

export interface Context {
  m: Messages
  locale: Locale
  /** How the user calls the CLI, for hints: "./werewolf" or "werewolf". */
  bin: string
  /** False with --yes or without a terminal: never prompt, use flags and defaults. */
  interactive: boolean
  flags: Flags
  positionals: string[]
  /** Switches the CLI language, e.g. after the language question. */
  setLocale(locale: Locale): void
}

/** Help sections; package 5 adds update/backup/restore/uninstall under "maintenance". */
export type CommandGroup = 'setup' | 'run' | 'maintenance' | 'other'

export interface Command {
  name: string
  group: CommandGroup
  summary: (m: Messages) => string
  options: OptionSpec[]
  /** Extra usage after the options, e.g. "[service…]". */
  args?: string
  examples?: string[]
  /** Prompts for answers: without a terminal it needs --yes. */
  asks?: boolean
  run(ctx: Context): Promise<number | void>
}

export function stringFlag(ctx: Context, name: string): string | undefined {
  const value = ctx.flags[name]
  return typeof value === 'string' ? value : undefined
}

export function booleanFlag(ctx: Context, name: string): boolean {
  return ctx.flags[name] === true
}

// Options shared by several commands.

export const yesOption: OptionSpec = {
  name: 'yes',
  short: 'y',
  type: 'boolean',
  description: (m) => m.flags.yes,
}

export const forceOption: OptionSpec = {
  name: 'force',
  type: 'boolean',
  description: (m) => m.flags.force,
}

export const settingOptions: OptionSpec[] = [
  { name: 'lang', type: 'string', value: '<de|en>', description: (m) => m.flags.lang },
  { name: 'name', type: 'string', value: '<text>', description: (m) => m.flags.name },
  { name: 'tagline', type: 'string', value: '<text>', description: (m) => m.flags.tagline },
  { name: 'accent', type: 'string', value: '<colour>', description: (m) => m.flags.accent },
  { name: 'logo', type: 'string', value: '<file|none>', description: (m) => m.flags.logo },
  { name: 'mode', type: 'string', value: '<domain|proxy|lan>', description: (m) => m.flags.mode },
  { name: 'domain', type: 'string', value: '<domain>', description: (m) => m.flags.domain },
  {
    name: 'proxy-via',
    type: 'string',
    value: '<port|network>',
    description: (m) => m.flags.proxyVia,
  },
  { name: 'port', type: 'string', value: '<port>', description: (m) => m.flags.port },
  { name: 'network', type: 'string', value: '<name>', description: (m) => m.flags.network },
  { name: 'time-zone', type: 'string', value: '<zone>', description: (m) => m.flags.timeZone },
  { name: 'imprint', type: 'string', value: '<url>', description: (m) => m.flags.imprint },
]

export const passwordOptions: OptionSpec[] = [
  { name: 'password', type: 'string', value: '<password>', description: (m) => m.flags.password },
  { name: 'generate-password', type: 'boolean', description: (m) => m.flags.generatePassword },
]
