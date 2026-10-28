import { commands } from './commands/index.ts'
import type { Command, CommandGroup, Context, OptionSpec } from './commands/types.ts'
import type { Messages } from './i18n/index.ts'
import { banner, cmd, pc } from './lib/ui.ts'

const GROUP_ORDER: CommandGroup[] = ['setup', 'run', 'maintenance', 'other']

export const globalOptions: OptionSpec[] = [
  { name: 'help', short: 'h', type: 'boolean', description: (m) => m.help.help },
  { name: 'version', short: 'v', type: 'boolean', description: (m) => m.help.version },
  { name: 'lang', type: 'string', value: '<de|en>', description: (m) => m.help.lang },
]

function heading(text: string): string {
  return pc.bold(pc.magenta(text))
}

function optionRows(options: OptionSpec[], m: Messages): [string, string][] {
  return options.map((option) => {
    const short = option.short ? `-${option.short}, ` : '    '
    const value = option.value ? ` ${pc.dim(option.value)}` : ''
    return [`${short}--${option.name}${value}`, option.description(m)]
  })
}

function visible(text: string): number {
  return text.replace(/\x1b\[[0-9;]*m/g, '').length
}

/** Rows with the left column padded to a common (visible) width. */
function columns(rows: [string, string][], minWidth = 0, indent = '  '): string {
  const width = Math.max(minWidth, ...rows.map(([left]) => visible(left)))
  return rows
    .map(
      ([left, right]) => `${indent}${left}${' '.repeat(width - visible(left))}   ${pc.dim(right)}`,
    )
    .join('\n')
}

export function renderHelp(ctx: Context): string {
  const { m, bin } = ctx
  const out: string[] = [banner(m.tagline)]
  out.push(`${heading(m.help.usage)}\n  ${cmd(bin)} ${pc.dim('<command> [options]')}`)
  // One width for all groups, so the descriptions line up across sections.
  const width = Math.max(...commands.map((command) => command.name.length))
  for (const group of GROUP_ORDER) {
    const inGroup = commands.filter((command) => command.group === group)
    if (inGroup.length === 0) continue
    const rows = inGroup.map((command): [string, string] => [cmd(command.name), command.summary(m)])
    out.push(`${heading(m.help.groups[group])}\n${columns(rows, width)}`)
  }
  out.push(`${heading(m.help.globalOptions)}\n${columns(optionRows(globalOptions, m))}`)
  const examples = [
    `${bin} setup`,
    `${bin} setup --mode lan --name "Kiez" --password "vollmond-heult-37" --yes`,
    `${bin} logs -f api`,
  ]
  out.push(`${heading(m.help.examples)}\n${examples.map((line) => `  ${cmd(line)}`).join('\n')}`)
  out.push(pc.dim(`  ${m.help.commandHelp(bin)}`))
  return `${out.join('\n\n')}\n`
}

export function renderCommandHelp(ctx: Context, command: Command): string {
  const { m, bin } = ctx
  const args = command.args ? ` ${pc.dim(command.args)}` : ''
  const out: string[] = [
    '',
    `${heading(m.help.usage)}\n  ${cmd(`${bin} ${command.name}`)} ${pc.dim('[options]')}${args}`,
    `  ${command.summary(m)}`,
  ]
  if (command.options.length > 0) {
    out.push(`${heading(m.help.options)}\n${columns(optionRows(command.options, m))}`)
  }
  out.push(`${heading(m.help.globalOptions)}\n${columns(optionRows(globalOptions, m))}`)
  if (command.examples?.length) {
    out.push(
      `${heading(m.help.examples)}\n${command.examples.map((e) => `  ${cmd(`${bin} ${e}`)}`).join('\n')}`,
    )
  }
  return `${out.join('\n\n')}\n`
}
