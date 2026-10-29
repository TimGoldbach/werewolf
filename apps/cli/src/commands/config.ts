import { readFileSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'
import * as p from '@clack/prompts'
import { composeUp, instanceUrls, printProxySnippets, requireInstance } from '../instance.ts'
import { composePs } from '../lib/docker.ts'
import { type EnvValues, updateEnv } from '../lib/env-file.ts'
import { CancelledError } from '../lib/errors.ts'
import { currentLogo, installLogo, removeLogo } from '../lib/logo.ts'
import { paths } from '../lib/paths.ts'
import { ACCENTS, type Settings, settingsFromEnv, settingsToEnv } from '../lib/settings.ts'
import { banner, hex, keyValues, pc } from '../lib/ui.ts'
import {
  type LogoChange,
  askAccent,
  askAccess,
  askGroupName,
  askImprint,
  askLocale,
  askLogo,
  askRetention,
  askTagline,
  askTimeZone,
  hasAnyFlag,
  confirm,
  unwrap,
} from '../questions.ts'
import { type Command, type Context, forceOption, settingOptions, yesOption } from './types.ts'

type Section = 'language' | 'branding' | 'access' | 'timeZone' | 'imprint' | 'backups'

/** Which flags belong to a section, and which env keys it writes. */
const SECTIONS: Record<Section, { flags: string[]; keys: string[] }> = {
  language: { flags: ['lang'], keys: ['DEFAULT_LOCALE'] },
  branding: {
    flags: ['name', 'tagline', 'accent', 'logo'],
    keys: ['GROUP_NAME', 'GROUP_TAGLINE', 'ACCENT_COLOR'],
  },
  access: {
    flags: ['mode', 'domain', 'proxy-via', 'port', 'network'],
    keys: ['COMPOSE_FILE', 'DOMAIN', 'WEB_BIND', 'WEB_PORT', 'PROXY_NETWORK', 'SECURE_COOKIES'],
  },
  timeZone: { flags: ['time-zone'], keys: ['TIME_ZONE'] },
  imprint: { flags: ['imprint'], keys: ['IMPRINT_URL'] },
  backups: { flags: ['backup-retention'], keys: ['BACKUP_RETENTION_DAYS'] },
}
const SECTION_NAMES = Object.keys(SECTIONS) as Section[]

export const config: Command = {
  name: 'config',
  group: 'setup',
  summary: (m) => m.commands.config,
  options: [
    ...settingOptions,
    {
      name: 'backup-retention',
      type: 'string',
      value: '<days>',
      description: (m) => m.flags.backupRetention,
    },
    yesOption,
    forceOption,
  ],
  examples: [
    'config',
    'config --accent blood --name "Moonlight Pack" --yes',
    'config --mode lan --port 8081 --yes',
  ],
  asks: true,
  run: (ctx) => runConfig(ctx),
}

/** Also used by `setup` when the instance already exists. */
export async function runConfig(ctx: Context, options: { embedded?: boolean } = {}): Promise<void> {
  const env = requireInstance(ctx)
  const current = settingsFromEnv(env)
  const logo = currentLogo(paths.branding)
  if (!options.embedded) {
    process.stdout.write(banner(ctx.m.tagline, ACCENTS[current.accent]))
    p.intro(pc.inverse(' werewolf config '))
    p.log.step(ctx.m.config.intro)
  }

  const { sections, fromFlags } = await chooseSections(ctx)
  // With flags, change exactly what was passed and keep everything else without asking.
  const ask = (): Context => (fromFlags ? { ...ctx, interactive: false } : ctx)
  const next: Settings = { ...current }
  let logoChange: LogoChange = { action: 'keep' }

  if (sections.includes('language')) {
    next.locale = await askLocale(ask(), current.locale)
    ctx.setLocale(next.locale)
  }
  if (sections.includes('branding')) {
    next.groupName = await askGroupName(ask(), current.groupName)
    next.tagline = await askTagline(ask(), current.tagline)
    next.accent = await askAccent(ask(), current.accent)
    logoChange = await askLogo(ask(), logo !== undefined)
  }
  if (sections.includes('access')) {
    const running = (await composePs()).filter((c) => c.state === 'running').map((c) => c.service)
    const publishesPort =
      current.mode === 'lan' || (current.mode === 'proxy' && current.proxyVia === 'port')
    Object.assign(
      next,
      await askAccess(ask(), current, {
        ownPort: running.includes('web') && publishesPort ? current.webPort : undefined,
        ownsWebPorts: running.includes('caddy'),
      }),
    )
  }
  if (sections.includes('timeZone')) next.timeZone = await askTimeZone(ask(), current.timeZone)
  if (sections.includes('imprint')) next.imprintUrl = await askImprint(ask(), current.imprintUrl)
  if (sections.includes('backups')) {
    next.backupRetentionDays = await askRetention(ask(), current.backupRetentionDays)
  }

  const updates = changedValues(env, settingsToEnv(next), sections)
  const changedKeys = Object.keys(updates)
  if (changedKeys.length === 0 && logoChange.action === 'keep') {
    p.outro(ctx.m.config.nothing)
    return
  }

  const rows: [string, string][] = changedKeys.map((key) => [
    key,
    `${pc.dim(env[key] || '""')} ${pc.dim('→')} ${pc.bold(updates[key] || '""')}`,
  ])
  if (logoChange.action !== 'keep') {
    const before = logo ? basename(logo.path) : ctx.m.common.none
    const after = logoChange.action === 'set' ? basename(logoChange.source) : ctx.m.common.none
    rows.push([ctx.m.config.logoChanged, `${pc.dim(before)} ${pc.dim('→')} ${pc.bold(after)}`])
  }
  p.note(keyValues(rows), ctx.m.config.changes)
  if (ctx.interactive && !(await confirm(ctx, ctx.m.config.confirm))) throw new CancelledError()

  writeFileSync(paths.env, updateEnv(readFileSync(paths.env, 'utf8'), updates), { mode: 0o600 })
  if (logoChange.action === 'set') installLogo(paths.branding, logoChange.source, logoChange.kind)
  if (logoChange.action === 'remove') removeLogo(paths.branding)
  p.log.success(ctx.m.config.saved)

  const running = (await composePs()).some((c) => c.state === 'running')
  if (running) {
    // Compose recreates every service whose configuration changed and removes the old overlay's.
    // The web app picks up a new logo file by itself.
    await composeUp(ctx, { start: ctx.m.config.applying, done: ctx.m.config.applied })
  } else {
    p.log.info(ctx.m.config.notRunning(ctx.bin))
  }

  if (sections.includes('access') && next.mode === 'proxy') printProxySnippets(ctx, next)
  const { open } = instanceUrls(next)
  p.outro(open ? hex(ACCENTS[next.accent])(open) : ctx.m.config.applied)
}

/** The sections named by flags, or (interactively, without flags) the ones the user picks. */
async function chooseSections(ctx: Context): Promise<{ sections: Section[]; fromFlags: boolean }> {
  const flagged = SECTION_NAMES.filter((section) => hasAnyFlag(ctx, SECTIONS[section].flags))
  if (flagged.length > 0 || !ctx.interactive) return { sections: flagged, fromFlags: true }
  p.log.info(pc.dim(ctx.m.config.passwordHint(ctx.bin)))
  const sections = unwrap(
    await p.multiselect({
      message: ctx.m.config.what,
      options: SECTION_NAMES.map((value) => ({ value, label: ctx.m.config.sections[value] })),
      required: true,
    }),
  )
  return { sections, fromFlags: false }
}

/** The env values of the chosen sections that differ from the current file. */
export function changedValues(current: EnvValues, next: EnvValues, sections: Section[]): EnvValues {
  const changed: EnvValues = {}
  for (const section of sections) {
    for (const key of SECTIONS[section].keys) {
      if (key in next && (current[key] ?? '') !== next[key]) changed[key] = next[key]
    }
  }
  return changed
}
