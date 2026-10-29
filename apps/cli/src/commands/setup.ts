import {
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  renameSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { basename, relative } from 'node:path'
import * as p from '@clack/prompts'
import {
  type ImagePlan,
  checkHealth,
  composeUp,
  instanceExists,
  instanceUrls,
  nextSteps,
  planImages,
  prepareImages,
  printProxySnippets,
} from '../instance.ts'
import { databaseVolumeExists, projectName } from '../lib/docker.ts'
import { renderInstanceEnv } from '../lib/env-file.ts'
import { CancelledError, CliError } from '../lib/errors.ts'
import { installLogo } from '../lib/logo.ts'
import { generateSecret, hashPassword } from '../lib/password.ts'
import { paths } from '../lib/paths.ts'
import { spinner } from '../lib/progress.ts'
import {
  ACCENTS,
  DEFAULT_ACCENT,
  DEFAULT_RETENTION_DAYS,
  DEFAULT_WEB_PORT,
  type Settings,
  settingsToEnv,
} from '../lib/settings.ts'
import { type Check, systemChecks } from '../lib/system.ts'
import { banner, hex, keyValues, pc, qrCode } from '../lib/ui.ts'
import {
  type LogoChange,
  type PasswordAnswer,
  accentLabel,
  askAccent,
  askAccess,
  askGroupName,
  askImprint,
  askLocale,
  askLogo,
  askPassword,
  askTagline,
  askTimeZone,
  confirm,
  systemTimeZone,
} from '../questions.ts'
import { runConfig } from './config.ts'
import {
  type Command,
  type Context,
  forceOption,
  passwordOptions,
  settingOptions,
  yesOption,
} from './types.ts'

export const setup: Command = {
  name: 'setup',
  group: 'setup',
  summary: (m) => m.commands.setup,
  options: [
    ...settingOptions,
    ...passwordOptions,
    { name: 'build', type: 'boolean', description: (m) => m.flags.build },
    { name: 'pull', type: 'boolean', description: (m) => m.flags.pull },
    yesOption,
    forceOption,
  ],
  examples: [
    'setup',
    'setup --mode lan --name "Kiez" --password "vollmond-heult-37" --yes',
    'setup --mode domain --domain werewolf.example.org --lang en --yes',
    'setup --mode proxy --proxy-via network --network proxy --domain werewolf.example.org --yes',
  ],
  asks: true,
  async run(ctx) {
    process.stdout.write(banner(ctx.m.tagline))
    p.intro(pc.inverse(' werewolf setup '))

    if (instanceExists()) {
      p.log.warn(ctx.m.setup.exists)
      if (!ctx.interactive) throw new CliError(ctx.m.setup.exists, ctx.m.setup.existsHint(ctx.bin))
      if (!(await confirm(ctx, ctx.m.setup.openConfig))) {
        p.outro(ctx.m.setup.existsHint(ctx.bin))
        return
      }
      return runConfig(ctx, { embedded: true })
    }

    await systemCheck(ctx)
    p.log.step(ctx.m.setup.intro)

    const locale = await askLocale(ctx, ctx.locale)
    ctx.setLocale(locale)
    const groupName = await askGroupName(ctx, '')
    const tagline = await askTagline(ctx, '')
    const accent = await askAccent(ctx, DEFAULT_ACCENT)
    const logo = await askLogo(ctx, false)
    const access = await askAccess(ctx, {
      mode: 'lan',
      domain: '',
      proxyVia: 'port',
      webPort: DEFAULT_WEB_PORT,
      proxyNetwork: '',
    })
    const timeZone = await askTimeZone(ctx, systemTimeZone())
    const password = await askPassword(ctx)
    const imprintUrl = await askImprint(ctx, '')
    const settings: Settings = {
      locale,
      groupName,
      tagline,
      accent,
      ...access,
      timeZone,
      imprintUrl,
      backupRetentionDays: DEFAULT_RETENTION_DAYS,
    }

    const plan = await planImages(ctx)
    p.note(keyValues(summaryRows(ctx, settings, logo, password, plan)), ctx.m.setup.summaryTitle)
    if (ctx.interactive && !(await confirm(ctx, ctx.m.setup.confirm))) {
      throw new CancelledError()
    }

    await writeInstance(ctx, settings, password.password, plan.tag, logo)
    await prepareImages(ctx, plan)
    await composeUp(ctx, { start: ctx.m.setup.starting, done: ctx.m.setup.started })
    await checkHealth(ctx, settings)
    successScreen(ctx, settings, password)
    p.outro(ctx.m.setup.outro)
  },
}

const ICONS = { ok: pc.green('✔'), warn: pc.yellow('▲'), fail: pc.red('✖') }

async function systemCheck(ctx: Context): Promise<void> {
  const spin = spinner()
  spin.start(ctx.m.checks.running)
  const checks = await systemChecks()
  const dockerWorks = checks.every((c) => c.id !== 'docker' || c.status === 'ok')
  const leftover = dockerWorks && (await databaseVolumeExists())
  spin.stop(ctx.m.checks.title)

  const width = Math.max(...checks.map((c) => ctx.m.checks.names[c.id].length))
  p.log.message(checks.map((c) => checkLine(ctx, c, width)).join('\n'))

  const failed = checks.filter((c) => c.status === 'fail')
  if (failed.length > 0) {
    const missingDocker = failed.some((c) => c.reason === 'missing')
    throw new CliError(ctx.m.checks.failed, missingDocker ? ctx.m.checks.installDocker : undefined)
  }
  if (leftover) throw new CliError(ctx.m.checks.volumeLeft, ctx.m.checks.volumeHint(projectName()))
}

function checkLine(ctx: Context, check: Check, width: number): string {
  const name = ctx.m.checks.names[check.id].padEnd(width)
  const details = [check.value, check.reason && ctx.m.checks.reasons[check.reason]]
    .filter(Boolean)
    .join(' · ')
  const tint = check.status === 'ok' ? pc.dim : check.status === 'warn' ? pc.yellow : pc.red
  return `${ICONS[check.status]} ${name}  ${tint(details)}`
}

function summaryRows(
  ctx: Context,
  settings: Settings,
  logo: LogoChange,
  password: PasswordAnswer,
  plan: ImagePlan,
): [string, string][] {
  const { m } = ctx
  const group = settings.tagline
    ? `${pc.bold(settings.groupName)} · ${settings.tagline}`
    : pc.bold(settings.groupName)
  const rows: [string, string][] = [
    [m.summary.language, m.languageName],
    [m.summary.group, group],
    [m.summary.accent, accentLabel(ctx, settings.accent)],
    [m.summary.logo, logo.action === 'set' ? basename(logo.source) : m.common.none],
    [m.summary.mode, m.modeNames[settings.mode]],
  ]
  const urls = instanceUrls(settings)
  if (settings.mode === 'lan')
    rows.push([m.summary.url, urls.open ?? m.summary.lanUrl(settings.webPort)])
  else if (settings.mode === 'domain' || settings.domain)
    rows.push([m.summary.url, urls.open ?? ''])
  if (settings.mode === 'proxy') {
    rows.push([
      '',
      settings.proxyVia === 'network'
        ? m.summary.proxyNetwork(settings.proxyNetwork)
        : m.summary.proxyPort(settings.webPort),
    ])
  }
  rows.push(
    [m.summary.timeZone, settings.timeZone],
    [m.summary.password, password.generated ? m.summary.passwordGenerated : m.summary.passwordOwn],
    [m.summary.imprint, settings.imprintUrl || m.common.none],
    [
      m.summary.images,
      plan.source === 'pull'
        ? m.setup.imagesPull(plan.tag)
        : `${m.setup.imagesBuild} ${pc.dim(`(${m.setup.imagesBuildReason})`)}`,
    ],
  )
  return rows
}

async function writeInstance(
  ctx: Context,
  settings: Settings,
  password: string,
  imageTag: string,
  logo: LogoChange,
): Promise<void> {
  const spin = spinner()
  spin.start(ctx.m.setup.writing)
  // Created here so they belong to the user; Docker would create missing mount sources as root.
  mkdirSync(paths.backups, { recursive: true })
  mkdirSync(paths.branding, { recursive: true })
  const env = renderInstanceEnv(readFileSync(paths.template, 'utf8'), {
    ...settingsToEnv(settings),
    POSTGRES_PASSWORD: generateSecret(24),
    SESSION_SECRET: generateSecret(48),
    GATE_PASSWORD: '',
    GATE_PASSWORD_HASH: await hashPassword(password),
    IMAGE_TAG: imageTag,
  })
  writeFileSync(paths.env, env, { mode: 0o600 })
  const movedEnv = linkEnv()
  if (logo.action === 'set') installLogo(paths.branding, logo.source, logo.kind)
  spin.stop(ctx.m.setup.written)
  if (movedEnv) p.log.info(ctx.m.setup.envBackup(movedEnv))
}

/** Links ./.env to instance/.env so plain `docker compose` finds it; moves a real file aside. */
function linkEnv(): string | undefined {
  const target = relative(paths.root, paths.env)
  let moved: string | undefined
  try {
    const stat = lstatSync(paths.envLink)
    if (stat.isSymbolicLink() && readlinkSync(paths.envLink) === target) return undefined
    moved = `.env.backup-${Date.now()}`
    renameSync(paths.envLink, `${paths.root}/${moved}`)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  symlinkSync(target, paths.envLink)
  return moved
}

function successScreen(ctx: Context, settings: Settings, password: PasswordAnswer): void {
  const { m } = ctx
  const urls = instanceUrls(settings)
  const open = urls.open
    ? pc.bold(pc.cyan(urls.open))
    : m.summary.proxyNetwork(settings.proxyNetwork)
  const note = password.generated ? m.setup.passwordOnce : m.setup.passwordOwn
  const rows: [string, string][] = [
    [m.setup.openAt, open],
    [m.setup.password, `${pc.bold(password.password)}\n${pc.dim(note)}`],
  ]
  p.log.success(pc.bold(m.setup.success))
  p.box(keyValues(rows), ` ${settings.groupName} `, {
    formatBorder: hex(ACCENTS[settings.accent]),
    contentPadding: 2,
  })
  if (urls.qr) p.log.message(`${m.setup.scan}\n\n${qrCode(urls.qr)}`)
  if (settings.mode === 'proxy') printProxySnippets(ctx, settings)
  p.log.step(pc.bold(m.setup.nextSteps))
  p.log.message(nextSteps(ctx))
}
