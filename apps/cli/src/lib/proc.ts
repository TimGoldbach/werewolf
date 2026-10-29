import { spawn } from 'node:child_process'

export interface RunOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
  /** Called for every complete line on stdout or stderr. */
  onLine?: (line: string) => void
  timeoutMs?: number
}

export interface RunResult {
  code: number
  stdout: string
  stderr: string
  /** stdout and stderr interleaved, as the user would have seen them. */
  output: string
}

/** Runs a command and collects its output. Never rejects; a missing binary yields code 127. */
export function run(command: string, args: string[], options: RunOptions = {}): Promise<RunResult> {
  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''
    let output = ''
    let pending = ''
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: options.timeoutMs,
    })
    const collect = (chunk: Buffer, isErr: boolean): void => {
      const text = chunk.toString()
      if (isErr) stderr += text
      else stdout += text
      output += text
      if (options.onLine) {
        pending += text
        const lines = pending.split(/\r?\n|\r/)
        pending = lines.pop() ?? ''
        for (const line of lines) if (line.trim()) options.onLine(line)
      }
    }
    child.stdout.on('data', (chunk: Buffer) => collect(chunk, false))
    child.stderr.on('data', (chunk: Buffer) => collect(chunk, true))
    child.on('error', (error: NodeJS.ErrnoException) => {
      const message = error.code === 'ENOENT' ? `${command}: command not found` : error.message
      resolve({ code: 127, stdout, stderr: stderr + message, output: output + message })
    })
    child.on('close', (code) => {
      if (options.onLine && pending.trim()) options.onLine(pending)
      resolve({ code: code ?? 1, stdout, stderr, output })
    })
  })
}

/** Runs a command attached to the terminal (for logs -f and the like). Resolves with the exit code. */
export function runInteractive(
  command: string,
  args: string[],
  options: RunOptions = {},
): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: options.cwd, env: options.env, stdio: 'inherit' })
    // Ctrl+C reaches the child directly; the CLI itself just waits for it to end.
    const ignore = (): void => {}
    process.on('SIGINT', ignore)
    child.on('error', () => resolve(127))
    child.on('close', (code) => {
      process.off('SIGINT', ignore)
      resolve(code ?? 0)
    })
  })
}

/** Last lines of a command's output, for error messages. */
export function tail(text: string, lines = 15): string {
  return text.trimEnd().split(/\r?\n/).slice(-lines).join('\n')
}
