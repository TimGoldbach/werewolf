import { existsSync, readFileSync } from 'node:fs'
import { type EnvValues, parseEnv } from './env-file.ts'
import { sleep } from './net.ts'
import { paths } from './paths.ts'
import { run, runInteractive, type RunOptions, type RunResult } from './proc.ts'

export function readInstanceEnv(): EnvValues | undefined {
  return existsSync(paths.env) ? parseEnv(readFileSync(paths.env, 'utf8')) : undefined
}

/**
 * Environment for docker compose. Values from instance/.env win over the shell, so a stray
 * `export WEB_PORT=…` cannot silently change what the CLI starts.
 */
function composeEnvironment(instanceEnv?: EnvValues): NodeJS.ProcessEnv {
  return { ...process.env, ...(instanceEnv ?? readInstanceEnv() ?? {}) }
}

export interface ComposeOptions extends Omit<RunOptions, 'cwd' | 'env'> {
  env?: EnvValues
}

export function compose(args: string[], options: ComposeOptions = {}): Promise<RunResult> {
  return run('docker', ['compose', ...args], {
    ...options,
    cwd: paths.root,
    env: composeEnvironment(options.env),
  })
}

export function composeInteractive(args: string[]): Promise<number> {
  return runInteractive('docker', ['compose', ...args], {
    cwd: paths.root,
    env: composeEnvironment(),
  })
}

export function projectName(): string {
  return process.env.COMPOSE_PROJECT_NAME || 'werewolf'
}

export interface ContainerState {
  service: string
  state: string
  health: string
  exitCode: number
}

/** All containers of the project, running or not. */
export async function composePs(): Promise<ContainerState[]> {
  const result = await compose(['ps', '--all', '--format', 'json'])
  if (result.code !== 0) return []
  const text = result.stdout.trim()
  if (!text) return []
  // Older Compose versions print one array, newer ones one object per line.
  const rows: Record<string, unknown>[] = text.startsWith('[')
    ? JSON.parse(text)
    : text.split('\n').map((line) => JSON.parse(line))
  return rows
    .map((row) => ({
      service: String(row.Service ?? ''),
      state: String(row.State ?? ''),
      health: String(row.Health ?? ''),
      exitCode: Number(row.ExitCode ?? 0),
    }))
    .sort((a, b) => a.service.localeCompare(b.service))
}

export async function isServiceRunning(service: string): Promise<boolean> {
  return (await composePs()).some((c) => c.service === service && c.state === 'running')
}

/** A database volume left over from an earlier installation (its password would not match). */
export async function databaseVolumeExists(): Promise<boolean> {
  const result = await run('docker', [
    'volume',
    'ls',
    '--quiet',
    '--filter',
    `label=com.docker.compose.project=${projectName()}`,
    '--filter',
    'label=com.docker.compose.volume=pgdata',
  ])
  return result.code === 0 && result.stdout.trim() !== ''
}

export async function networkExists(name: string): Promise<boolean> {
  return (await run('docker', ['network', 'inspect', name])).code === 0
}

/**
 * Waits until the web container answers /api/health through its /api rewrite, i.e. web, api
 * and database work together.
 */
export async function waitForApp(timeoutMs = 120_000): Promise<boolean> {
  const script =
    "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const result = await compose(['exec', '-T', 'web', 'node', '-e', script])
    if (result.code === 0) return true
    await sleep(2000)
  }
  return false
}
