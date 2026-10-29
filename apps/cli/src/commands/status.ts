import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import * as p from '@clack/prompts'
import { LOCAL_TAG, instanceUrls, requireInstance } from '../instance.ts'
import { type ContainerState, checkoutVersion, composePs } from '../lib/docker.ts'
import { paths } from '../lib/paths.ts'
import { ACCENTS, type Locale, settingsFromEnv } from '../lib/settings.ts'
import { formatBytes } from '../lib/system.ts'
import { hex, keyValues, pc } from '../lib/ui.ts'
import { cliVersion } from '../version.ts'
import type { Command, Context } from './types.ts'

const DAY = 24 * 60 * 60 * 1000

export const status: Command = {
  name: 'status',
  group: 'run',
  summary: (m) => m.commands.status,
  options: [],
  async run(ctx) {
    const env = requireInstance(ctx)
    const settings = settingsFromEnv(env)
    const accent = hex(ACCENTS[settings.accent])
    const [checkout, containers] = await Promise.all([checkoutVersion(), composePs()])

    p.intro(`🐺 ${accent(pc.bold(settings.groupName || 'werewolf'))}`)

    const imageTag = env.IMAGE_TAG || 'latest'
    const version = [`v${cliVersion()}`, checkout && pc.dim(`(${checkout})`)]
      .filter(Boolean)
      .join(' ')
    const { open } = instanceUrls(settings)
    const rows: [string, string][] = [
      [ctx.m.status.version, version],
      [ctx.m.status.images, imageTag === LOCAL_TAG ? ctx.m.status.imagesLocal : imageTag],
      [ctx.m.status.mode, ctx.m.modeNames[settings.mode]],
      [ctx.m.status.url, open ? pc.cyan(open) : ctx.m.summary.proxyNetwork(settings.proxyNetwork)],
      [ctx.m.status.containers, containerLines(ctx, containers)],
      [ctx.m.status.backup, backupLine(ctx)],
    ]
    p.log.message(keyValues(rows))
    p.outro()

    const healthy =
      containers.length > 0 &&
      containers.every((c) => c.state === 'running' && c.health !== 'unhealthy')
    return healthy ? 0 : 1
  },
}

function containerLines(ctx: Context, containers: ContainerState[]): string {
  if (containers.length === 0) return pc.yellow(ctx.m.status.noContainers)
  const width = Math.max(...containers.map((c) => c.service.length))
  return containers
    .map((c) => {
      const ok = c.state === 'running' && c.health !== 'unhealthy' && c.health !== 'starting'
      const dot = ok ? pc.green('●') : c.state === 'running' ? pc.yellow('●') : pc.red('●')
      const state = ctx.m.status.states[c.state] ?? c.state
      const health = c.health ? ` · ${ctx.m.status.health[c.health] ?? c.health}` : ''
      return `${dot} ${c.service.padEnd(width)}  ${pc.dim(state + health)}`
    })
    .join('\n')
}

function backupLine(ctx: Context): string {
  const latest = latestBackup(paths.backups)
  if (!latest) return pc.dim(ctx.m.status.noBackup)
  const age = Date.now() - latest.mtime
  const text = `${latest.name} · ${relativeTime(ctx.locale, latest.mtime)} · ${formatBytes(latest.size)}`
  return age > 2 * DAY ? `${pc.yellow(text)}\n${pc.yellow(ctx.m.status.backupOld)}` : text
}

export function latestBackup(
  dir: string,
): { name: string; mtime: number; size: number } | undefined {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return undefined
  }
  return entries
    .filter((name) => /\.sql(\.gz)?$/.test(name))
    .map((name) => {
      const stat = statSync(join(dir, name))
      return { name, mtime: stat.mtimeMs, size: stat.size }
    })
    .sort((a, b) => b.mtime - a.mtime)[0]
}

function relativeTime(locale: Locale, time: number): string {
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const minutes = Math.round((time - Date.now()) / 60_000)
  if (Math.abs(minutes) < 60) return format.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 48) return format.format(hours, 'hour')
  return format.format(Math.round(hours / 24), 'day')
}
