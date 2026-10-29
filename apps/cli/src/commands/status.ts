import * as p from '@clack/prompts'
import { instanceUrls, isLocalTag, requireInstance } from '../instance.ts'
import { listBackups } from '../lib/backups.ts'
import { type ContainerState, composePs } from '../lib/docker.ts'
import { checkoutVersion, releaseTag, remoteTags } from '../lib/git.ts'
import { paths } from '../lib/paths.ts'
import { ACCENTS, type Locale, settingsFromEnv } from '../lib/settings.ts'
import { formatBytes } from '../lib/system.ts'
import { cmd, hex, keyValues, pc } from '../lib/ui.ts'
import { compareTags, newestRelease } from '../lib/versions.ts'
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
    const [checkout, containers, update] = await Promise.all([
      checkoutVersion(),
      composePs(),
      availableUpdate(),
    ])

    p.intro(`🐺 ${accent(pc.bold(settings.groupName || 'werewolf'))}`)

    const imageTag = env.IMAGE_TAG || 'latest'
    const version = [`v${cliVersion()}`, checkout && pc.dim(`(${checkout})`)]
      .filter(Boolean)
      .join(' ')
    const { open } = instanceUrls(settings)
    const rows: [string, string][] = [
      [ctx.m.status.version, version],
      [ctx.m.status.images, isLocalTag(imageTag) ? ctx.m.status.imagesLocal(imageTag) : imageTag],
      [ctx.m.status.mode, ctx.m.modeNames[settings.mode]],
      [ctx.m.status.url, open ? pc.cyan(open) : ctx.m.summary.proxyNetwork(settings.proxyNetwork)],
      [ctx.m.status.containers, containerLines(ctx, containers)],
      [ctx.m.status.backup, backupLine(ctx)],
    ]
    if (update) {
      rows.splice(1, 0, [
        ctx.m.status.update,
        pc.yellow(`${ctx.m.status.updateAvailable(update)} → ${cmd(`${ctx.bin} update`)}`),
      ])
    }
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
  const latest = listBackups(paths.backups)[0]
  if (!latest) return pc.dim(ctx.m.status.noBackup)
  const age = Date.now() - latest.mtime
  const text = `${latest.name} · ${relativeTime(ctx.locale, latest.mtime)} · ${formatBytes(latest.size)}`
  return age > 2 * DAY ? `${pc.yellow(text)}\n${pc.yellow(ctx.m.status.backupOld)}` : text
}

/** A release on the remote that is newer than this checkout (best effort, offline is fine). */
async function availableUpdate(): Promise<string | undefined> {
  const tags = await remoteTags()
  const newest = tags && newestRelease(tags)
  if (!newest) return undefined
  const installed = (await releaseTag()) ?? `v${cliVersion()}`
  return compareTags(newest, installed) > 0 ? newest : undefined
}

function relativeTime(locale: Locale, time: number): string {
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const minutes = Math.round((time - Date.now()) / 60_000)
  if (Math.abs(minutes) < 60) return format.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 48) return format.format(hours, 'hour')
  return format.format(Math.round(hours / 24), 'day')
}
