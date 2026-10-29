// Spinners and live task logs redraw the terminal; when the output goes to a file or a CI
// log they fall back to plain lines.
import * as p from '@clack/prompts'

export interface Spinner {
  start(message: string): void
  stop(message: string): void
  error(message: string): void
  clear(): void
}

export function spinner(): Spinner {
  if (process.stdout.isTTY) return p.spinner()
  return {
    start: () => {},
    stop: (message) => p.log.step(message),
    error: (message) => p.log.error(message),
    clear: () => {},
  }
}

export interface TaskLog {
  message(line: string): void
  success(message: string): void
  error(message: string): void
}

/** Shows the last lines of a long-running command while it runs; keeps them on failure. */
export function taskLog(title: string): TaskLog {
  if (process.stdout.isTTY) return p.taskLog({ title, limit: 8 })
  p.log.step(title)
  return {
    message: (line) => process.stdout.write(`│  ${line}\n`),
    success: (message) => p.log.success(message),
    error: (message) => p.log.error(message),
  }
}
