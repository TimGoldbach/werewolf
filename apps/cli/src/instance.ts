// Steps shared by several commands: reading the instance, pulling/building images, starting
// the stack, health checks and the URL of the instance.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import * as p from '@clack/prompts'
import type { Context } from './commands/types.ts'
import { booleanFlag } from './commands/types.ts'
import { compose, readInstanceEnv, releaseTag, waitForApp } from './lib/docker.ts'
import { type EnvValues, updateEnv } from './lib/env-file.ts'
import { CliError } from './lib/errors.ts'
import { httpStatus, lanAddress, sleep } from './lib/net.ts'
import { paths } from './lib/paths.ts'
import { tail } from './lib/proc.ts'
import { spinner, taskLog } from './lib/progress.ts'
import { proxySnippets } from './lib/proxy-snippets.ts'
import type { Settings } from './lib/settings.ts'
import { cmd, pc } from './lib/ui.ts'

export function requireInstance(ctx: Context): EnvValues {
  const env = readInstanceEnv()
  if (!env) throw new CliError(ctx.m.common.noInstance, ctx.m.common.runSetup(ctx.bin))
  return env
}

export function instanceExists(): boolean {
  return existsSync(paths.env)
}

// ── URLs ─────────────────────────────────────────────────────────────────────

export interface InstanceUrls {
  /** What people open in the browser (undefined: only reachable through the proxy network). */
  open?: string
  /** Health endpoint as seen from this host, for the reachability check. */
  probe?: string
  /** LAN mode: the address for the QR code. */
  qr?: string
}

export function instanceUrls(settings: Settings): InstanceUrls {
  const local = `http://127.0.0.1:${settings.webPort}`
  switch (settings.mode) {
    case 'domain':
      return { open: `https://${settings.domain}`, probe: `https://${settings.domain}/api/health` }
    case 'proxy':
      if (settings.proxyVia === 'network') {
        return { open: settings.domain ? `https://${settings.domain}` : undefined }
      }
      return {
        open: settings.domain ? `https://${settings.domain}` : local,
        probe: `${local}/api/health`,
      }
    case 'lan': {
      const ip = lanAddress()
      const open = `http://${ip ?? 'localhost'}:${settings.webPort}`
      return { open, probe: `${local}/api/health`, qr: ip ? open : undefined }
    }
  }
}

// ── Images ───────────────────────────────────────────────────────────────────

export interface ImagePlan {
  source: 'pull' | 'build'
  /** Value for IMAGE_TAG. */
  tag: string
}

/** Local builds get their own tag, so a later pull of a release never mixes with them. */
export const LOCAL_TAG = 'local'

/**
 * Release checkouts pull the matching images; anything else builds, because there are no
 * images for arbitrary commits. --build and --pull override this.
 */
export async function planImages(ctx: Context): Promise<ImagePlan> {
  if (booleanFlag(ctx, 'build')) return { source: 'build', tag: LOCAL_TAG }
  const tag = await releaseTag()
  if (booleanFlag(ctx, 'pull')) return { source: 'pull', tag: tag ?? 'latest' }
  return tag ? { source: 'pull', tag } : { source: 'build', tag: LOCAL_TAG }
}

/** Pulls or builds the images. Returns the plan that was actually carried out. */
export async function prepareImages(ctx: Context, plan: ImagePlan): Promise<ImagePlan> {
  if (plan.source === 'pull') {
    const spin = spinner()
    spin.start(ctx.m.setup.pulling(plan.tag))
    const result = await compose(['pull', '--quiet'])
    if (result.code === 0) {
      spin.stop(ctx.m.setup.pulled)
      return plan
    }
    spin.error(ctx.m.setup.pullFailed)
    plan = { source: 'build', tag: LOCAL_TAG }
    setImageTag(plan.tag)
  }

  const spin = spinner()
  spin.start(ctx.m.setup.pullingBase)
  const base = await compose(['pull', '--quiet', '--ignore-buildable'])
  if (base.code !== 0) {
    spin.error(ctx.m.common.dockerFailed)
    throw new CliError(tail(base.output))
  }
  spin.stop(ctx.m.setup.basePulled)

  const log = taskLog(ctx.m.setup.building)
  const build = await compose(['--progress', 'plain', 'build'], {
    onLine: (line) => log.message(line.slice(0, 160)),
  })
  if (build.code !== 0) {
    log.error(ctx.m.setup.buildFailed)
    throw new CliError(ctx.m.setup.buildFailed, tail(build.output, 25))
  }
  log.success(ctx.m.setup.built)
  return plan
}

function setImageTag(tag: string): void {
  writeFileSync(paths.env, updateEnv(readFileSync(paths.env, 'utf8'), { IMAGE_TAG: tag }))
}

// ── Running ──────────────────────────────────────────────────────────────────

/** `docker compose up -d --wait` with a spinner; throws with Compose's output on failure. */
export async function composeUp(
  ctx: Context,
  labels: { start: string; done: string },
  extraArgs: string[] = [],
): Promise<void> {
  const spin = spinner()
  spin.start(labels.start)
  const result = await compose([
    'up',
    '--detach',
    '--wait',
    '--wait-timeout',
    '300',
    '--remove-orphans',
    ...extraArgs,
  ])
  if (result.code !== 0) {
    spin.error(ctx.m.setup.startFailed)
    throw new CliError(tail(result.output, 20), ctx.m.setup.logsHint(ctx.bin))
  }
  spin.stop(labels.done)
}

/**
 * Checks that the app answers: always from inside the web container (web → api → db), and
 * from this host through the published port or domain where there is one (warning only).
 */
export async function checkHealth(ctx: Context, settings: Settings): Promise<void> {
  const spin = spinner()
  spin.start(ctx.m.setup.checkingHealth)
  if (!(await waitForApp())) {
    spin.error(ctx.m.setup.unhealthy)
    throw new CliError(ctx.m.setup.unhealthy, ctx.m.setup.logsHint(ctx.bin))
  }
  const { probe, open } = instanceUrls(settings)
  if (probe) {
    // Caddy may still be fetching its certificate right after the first start.
    let status = 0
    for (let attempt = 0; attempt < 10 && status !== 200; attempt++) {
      status = await httpStatus(probe)
      if (status !== 200) await sleep(2000)
    }
    if (status !== 200) {
      spin.stop(ctx.m.setup.healthy)
      p.log.warn(ctx.m.setup.externalUnreachable(open ?? probe))
      return
    }
  }
  spin.stop(ctx.m.setup.healthy)
}

export function printProxySnippets(ctx: Context, settings: Settings): void {
  const upstream =
    settings.proxyVia === 'network' ? 'werewolf-web:3000' : `127.0.0.1:${settings.webPort}`
  p.log.step(pc.bold(ctx.m.proxy.title))
  p.log.message(pc.dim(ctx.m.proxy.intro))
  for (const snippet of proxySnippets(upstream, settings.domain)) {
    p.note(
      snippet.code
        .split('\n')
        .map((line) => pc.cyan(line))
        .join('\n'),
      snippet.name,
    )
  }
  p.log.info(ctx.m.proxy.tls)
}

export function nextSteps(ctx: Context): string {
  const rows: [string, string][] = [
    [`${ctx.bin} status`, ctx.m.setup.next.status],
    [`${ctx.bin} logs -f`, ctx.m.setup.next.logs],
    [`${ctx.bin} config`, ctx.m.setup.next.config],
    [`${ctx.bin} password`, ctx.m.setup.next.password],
  ]
  if (ctx.bin !== 'werewolf') rows.push([`${ctx.bin} link`, ctx.m.setup.next.link])
  const width = Math.max(...rows.map(([command]) => command.length))
  return rows.map(([command, text]) => `${cmd(command.padEnd(width))}   ${pc.dim(text)}`).join('\n')
}
