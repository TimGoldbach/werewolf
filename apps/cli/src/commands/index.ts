import { config } from './config.ts'
import { restart, start, stop } from './lifecycle.ts'
import { link } from './link.ts'
import { logs } from './logs.ts'
import { password } from './password.ts'
import { setup } from './setup.ts'
import { status } from './status.ts'
import type { Command } from './types.ts'

/** All commands, in help order. A new command is a module plus an entry here. */
export const commands: Command[] = [
  setup,
  config,
  password,
  status,
  logs,
  start,
  stop,
  restart,
  link,
]

export function findCommand(name: string): Command | undefined {
  return commands.find((command) => command.name === name)
}
