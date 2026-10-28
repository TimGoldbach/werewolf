// The setup questions, shared by `setup` and `config`. Each one takes its answer from a flag
// if given, falls back to the current value when not interactive, and prompts otherwise.

import * as p from '@clack/prompts'
import { type Context, booleanFlag, stringFlag } from './commands/types.ts'
import { messages } from './i18n/index.ts'
import { networkExists } from './lib/docker.ts'
import { CancelledError, CliError } from './lib/errors.ts'
import { type LogoKind, checkLogo } from './lib/logo.ts'
import { checkDomain, isPortInUse } from './lib/net.ts'
import { generatePassword } from './lib/password.ts'
import { spinner } from './lib/progress.ts'
import {
  ACCENTS,
  ACCENT_NAMES,
  type Accent,
  LOCALES,
  type Locale,
  MODES,
  type Mode,
  PROXY_VIA,
  type ProxyVia,
  type Settings,
  isAccent,
  isLocale,
  isMode,
  isProxyVia,
} from './lib/settings.ts'
import { pc, swatch } from './lib/ui.ts'
import {
  type Problem,
  normalizeDomain,
  parsePort,
  validateDomain,
  validateGroupName,
  validateNetworkName,
  validateOptionalUrl,
  validatePassword,
  validatePort,
  validateTagline,
  validateTimeZone,
} from './lib/validate.ts'

/** Unpacks a prompt result; Ctrl+C / Escape become a CancelledError. */
export function unwrap<T>(value: T): Exclude<T, symbol> {
  if (p.isCancel(value)) throw new CancelledError()
  return value as Exclude<T, symbol>
}

/** A yes/no question with translated labels. */
export async function confirm(
  ctx: Context,
  message: string,
  initialValue = true,
): Promise<boolean> {
  return unwrap(
    await p.confirm({ message, initialValue, active: ctx.m.common.yes, inactive: ctx.m.common.no }),
  )
}

/** Adapts a validator to clack: undefined when fine, otherwise the translated problem. */
function check(ctx: Context, validator: (value: string) => Problem | undefined) {
  return (value: string | undefined): string | undefined => {
    const problem = validator(value ?? '')
    return problem ? ctx.m.invalid[problem] : undefined
  }
}

/** Reads a string flag and validates it; throws a CliError naming the flag. */
function flagValue(
  ctx: Context,
  name: string,
  validator?: (value: string) => Problem | undefined,
): string | undefined {
  const value = stringFlag(ctx, name)
  if (value === undefined) return undefined
  const problem = validator?.(value)
  if (problem) throw new CliError(ctx.m.invalidFlag(name, value, ctx.m.invalid[problem]))
  return value.trim()
}

function choiceFlag<T extends string>(
  ctx: Context,
  name: string,
  choices: readonly T[],
  guard: (value: string) => value is T,
): T | undefined {
  const value = stringFlag(ctx, name)
  if (value === undefined) return undefined
  if (!guard(value)) throw new CliError(ctx.m.invalidChoice(name, value, choices.join(', ')))
  return value
}

/** Whether any of the given flags was passed; used to skip questions in `config`. */
export function hasAnyFlag(ctx: Context, names: string[]): boolean {
  return names.some((name) => ctx.flags[name] !== undefined)
}

// ── Language ─────────────────────────────────────────────────────────────────

export async function askLocale(ctx: Context, current: Locale): Promise<Locale> {
  const flag = choiceFlag(ctx, 'lang', LOCALES, isLocale)
  if (flag) return flag
  if (!ctx.interactive) return current
  return unwrap(
    await p.select({
      // Asked before the language is known, so the question itself is bilingual.
      message: 'Sprache · Language',
      options: LOCALES.map((locale) => ({
        value: locale,
        label: messages[locale].languageName,
        hint: messages[locale].q.languageHint,
      })),
      initialValue: current,
    }),
  )
}

// ── Branding ─────────────────────────────────────────────────────────────────

export async function askGroupName(ctx: Context, current: string): Promise<string> {
  const flag = flagValue(ctx, 'name', validateGroupName)
  if (flag !== undefined) return flag
  const fallback = current || ctx.m.q.defaultGroupName
  if (!ctx.interactive) return fallback
  const value = unwrap(
    await p.text({
      message: ctx.m.q.groupName,
      placeholder: current ? undefined : fallback,
      initialValue: current || undefined,
      defaultValue: fallback,
      validate: (value) => (value ? check(ctx, validateGroupName)(value) : undefined),
    }),
  )
  return value.trim()
}

export async function askTagline(ctx: Context, current: string): Promise<string> {
  const flag = flagValue(ctx, 'tagline', validateTagline)
  if (flag !== undefined) return flag
  if (!ctx.interactive) return current
  const value = unwrap(
    await p.text({
      message: ctx.m.q.tagline,
      placeholder: ctx.m.q.taglinePlaceholder,
      initialValue: current || undefined,
      defaultValue: '',
      validate: check(ctx, validateTagline),
    }),
  )
  return value.trim()
}

export function accentLabel(ctx: Context, accent: Accent): string {
  return [swatch(ACCENTS[accent]), ctx.m.q.accents[accent]].filter(Boolean).join(' ')
}

export async function askAccent(ctx: Context, current: Accent): Promise<Accent> {
  const flag = choiceFlag(ctx, 'accent', ACCENT_NAMES, isAccent)
  if (flag) return flag
  if (!ctx.interactive) return current
  return unwrap(
    await p.select({
      message: ctx.m.q.accent,
      options: ACCENT_NAMES.map((accent) => ({
        value: accent,
        label: `${swatch(ACCENTS[accent], 6)} ${ctx.m.q.accents[accent]}`,
        hint: accent,
      })),
      initialValue: current,
    }),
  )
}

export type LogoChange =
  | { action: 'keep' }
  | { action: 'remove' }
  | { action: 'set'; source: string; kind: LogoKind }

export async function askLogo(ctx: Context, hasLogo: boolean): Promise<LogoChange> {
  const flag = stringFlag(ctx, 'logo')
  if (flag !== undefined) {
    if (['none', ''].includes(flag.trim()))
      return hasLogo ? { action: 'remove' } : { action: 'keep' }
    const result = checkLogo(flag)
    if (!result.ok) throw new CliError(ctx.m.invalidFlag('logo', flag, ctx.m.logo[result.problem]))
    return { action: 'set', source: result.path, kind: result.kind }
  }
  if (!ctx.interactive) return { action: 'keep' }

  if (hasLogo) {
    const choice = unwrap(
      await p.select({
        message: ctx.m.summary.logo,
        options: [
          { value: 'keep', label: ctx.m.q.logoKeep },
          { value: 'replace', label: ctx.m.q.logoReplace },
          { value: 'remove', label: ctx.m.q.logoRemove },
        ],
        initialValue: 'keep',
      }),
    )
    if (choice === 'keep') return { action: 'keep' }
    if (choice === 'remove') return { action: 'remove' }
  } else {
    const wanted = await confirm(
      ctx,
      `${ctx.m.q.logoAsk} ${pc.dim(`(${ctx.m.q.logoHint})`)}`,
      false,
    )
    if (!wanted) return { action: 'keep' }
  }

  const path = unwrap(
    await p.path({
      message: ctx.m.q.logoPath,
      validate: (value) => {
        if (!value) return ctx.m.invalid.required
        const result = checkLogo(value)
        return result.ok ? undefined : ctx.m.logo[result.problem]
      },
    }),
  )
  const result = checkLogo(path)
  if (!result.ok) throw new CliError(ctx.m.logo[result.problem])
  return { action: 'set', source: result.path, kind: result.kind }
}

// ── Access mode ──────────────────────────────────────────────────────────────

export type Access = Pick<Settings, 'mode' | 'domain' | 'proxyVia' | 'webPort' | 'proxyNetwork'>

export interface AccessOptions {
  /** Port the running instance already publishes (not "in use" for our purposes). */
  ownPort?: number
  /** Ports 80/443 already belong to our running Caddy. */
  ownsWebPorts?: boolean
}

export async function askAccess(
  ctx: Context,
  current: Access,
  options: AccessOptions = {},
): Promise<Access> {
  const flagMode = choiceFlag(ctx, 'mode', MODES, isMode)
  let mode: Mode
  if (flagMode) mode = flagMode
  else if (!ctx.interactive) mode = current.mode
  else {
    mode = unwrap(
      await p.select({
        message: ctx.m.q.mode,
        options: MODES.map((value) => ({
          value,
          label: ctx.m.q.modes[value],
          hint: ctx.m.q.modeHints[value],
        })),
        initialValue: current.mode,
      }),
    )
  }

  const access: Access = {
    mode,
    domain: current.domain,
    proxyVia: current.proxyVia,
    webPort: current.webPort,
    proxyNetwork: current.proxyNetwork,
  }
  if (mode === 'domain') {
    access.domain = await askDomain(ctx, current.domain, true)
    await precheckDomain(ctx, access.domain, options)
  } else if (mode === 'proxy') {
    access.proxyVia = await askProxyVia(ctx, current.proxyVia)
    if (access.proxyVia === 'port')
      access.webPort = await askPort(ctx, current.webPort, options.ownPort)
    else access.proxyNetwork = await askNetwork(ctx, current.proxyNetwork)
    access.domain = await askDomain(ctx, current.domain, false)
  } else {
    access.webPort = await askPort(ctx, current.webPort, options.ownPort)
  }
  return access
}

async function askDomain(ctx: Context, current: string, required: boolean): Promise<string> {
  const validator = required
    ? validateDomain
    : (value: string) => (value.trim() ? validateDomain(value) : undefined)
  const flag = flagValue(ctx, 'domain', validator)
  if (flag !== undefined) return normalizeDomain(flag)
  if (!ctx.interactive) {
    if (required && !current) throw new CliError(ctx.m.missingFlag('domain'))
    return current
  }
  const value = unwrap(
    await p.text({
      message: required ? ctx.m.q.domain : ctx.m.q.proxyDomain,
      placeholder: ctx.m.q.domainPlaceholder,
      initialValue: current || undefined,
      defaultValue: '',
      validate: check(ctx, validator),
    }),
  )
  return normalizeDomain(value)
}

async function askProxyVia(ctx: Context, current: ProxyVia): Promise<ProxyVia> {
  const flag = choiceFlag(ctx, 'proxy-via', PROXY_VIA, isProxyVia)
  if (flag) return flag
  // A given --network implies the network variant.
  if (stringFlag(ctx, 'network') !== undefined) return 'network'
  if (!ctx.interactive) return current
  return unwrap(
    await p.select({
      message: ctx.m.q.proxyVia,
      options: PROXY_VIA.map((value) => ({
        value,
        label: ctx.m.q.proxyVias[value],
        hint: ctx.m.q.proxyViaHints[value],
      })),
      initialValue: current,
    }),
  )
}

async function askNetwork(ctx: Context, current: string): Promise<string> {
  const flag = flagValue(ctx, 'network', validateNetworkName)
  let network = flag ?? current
  if (flag === undefined && !ctx.interactive && !current)
    throw new CliError(ctx.m.missingFlag('network'))
  let askNow = flag === undefined && ctx.interactive
  for (;;) {
    if (askNow) {
      const value = unwrap(
        await p.text({
          message: ctx.m.q.network,
          placeholder: ctx.m.q.networkPlaceholder,
          initialValue: network || undefined,
          validate: check(ctx, validateNetworkName),
        }),
      )
      network = value.trim()
    }
    // Compose refuses to start when the external network is missing.
    if (await networkExists(network)) return network
    if (!ctx.interactive) {
      if (booleanFlag(ctx, 'force')) {
        p.log.warn(ctx.m.networkMissing(network))
        return network
      }
      throw new CliError(ctx.m.networkMissing(network), ctx.m.domainCheck.forceHint)
    }
    p.log.warn(ctx.m.networkMissing(network))
    askNow = true
  }
}

/** Asks for a host port and makes sure nothing else listens on it. */
async function askPort(ctx: Context, current: number, ownPort?: number): Promise<number> {
  const flag = flagValue(ctx, 'port', validatePort)
  let port = flag !== undefined ? (parsePort(flag) as number) : current
  let askNow = flag === undefined && ctx.interactive
  for (;;) {
    if (askNow) {
      const value = unwrap(
        await p.text({
          message: ctx.m.q.port,
          initialValue: String(port),
          validate: check(ctx, validatePort),
        }),
      )
      port = parsePort(value) as number
    }
    if (port === ownPort || !(await isPortInUse(port))) return port
    if (!ctx.interactive) {
      if (booleanFlag(ctx, 'force')) {
        p.log.warn(ctx.m.portBusy(port))
        return port
      }
      throw new CliError(ctx.m.portBusy(port), ctx.m.domainCheck.forceHint)
    }
    p.log.warn(`${ctx.m.portBusy(port)} ${ctx.m.portPick}`)
    askNow = true
  }
}

/** Domain mode needs DNS pointing here and free ports 80/443 (for Caddy and ACME). */
async function precheckDomain(ctx: Context, domain: string, options: AccessOptions): Promise<void> {
  const spin = spinner()
  spin.start(ctx.m.domainCheck.running(domain))
  const problems: string[] = []
  const dns = await checkDomain(domain)
  if (dns.addresses.length === 0) problems.push(ctx.m.domainCheck.unresolved(domain))
  else if (!dns.pointsHere)
    problems.push(ctx.m.domainCheck.elsewhere(domain, dns.addresses.join(', ')))
  if (!options.ownsWebPorts) {
    for (const port of [80, 443]) {
      if (await isPortInUse(port)) problems.push(ctx.m.domainCheck.portBusy(port))
    }
  }
  if (problems.length === 0) {
    spin.stop(ctx.m.domainCheck.ok(domain))
    return
  }
  spin.clear()
  for (const problem of problems) p.log.warn(problem)
  if (!ctx.interactive) {
    if (booleanFlag(ctx, 'force')) return
    throw new CliError(ctx.m.domainCheck.aborted, ctx.m.domainCheck.forceHint)
  }
  const go = await confirm(ctx, ctx.m.domainCheck.continueAnyway, false)
  if (!go) throw new CliError(ctx.m.domainCheck.aborted)
}

// ── Time zone, password, imprint ─────────────────────────────────────────────

export function systemTimeZone(): string {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  return zone && !validateTimeZone(zone) ? zone : 'UTC'
}

export async function askTimeZone(ctx: Context, current: string): Promise<string> {
  const flag = flagValue(ctx, 'time-zone', validateTimeZone)
  if (flag !== undefined) return flag
  if (!ctx.interactive) return current
  const zones = Intl.supportedValuesOf('timeZone')
  if (!zones.includes('UTC')) zones.unshift('UTC')
  if (!zones.includes(current)) zones.unshift(current)
  return unwrap(
    await p.autocomplete({
      message: ctx.m.q.timeZone,
      options: zones.map((zone) => ({ value: zone })),
      initialValue: current,
      placeholder: ctx.m.q.timeZoneSearch,
      maxItems: 8,
    }),
  )
}

export interface PasswordAnswer {
  password: string
  generated: boolean
}

export async function askPassword(ctx: Context): Promise<PasswordAnswer> {
  const flag = stringFlag(ctx, 'password')
  if (flag !== undefined) {
    const problem = validatePassword(flag)
    if (problem) throw new CliError(ctx.m.invalidFlag('password', '…', ctx.m.invalid[problem]))
    return { password: flag, generated: false }
  }
  if (booleanFlag(ctx, 'generate-password') || !ctx.interactive) {
    return { password: generatePassword(ctx.locale), generated: true }
  }
  for (;;) {
    const suggestion = generatePassword(ctx.locale)
    const choice = unwrap(
      await p.select({
        message: ctx.m.q.passwordChoice,
        options: [
          { value: 'use', label: ctx.m.q.passwordUse(pc.bold(suggestion)) },
          { value: 'another', label: ctx.m.q.passwordAnother },
          { value: 'own', label: ctx.m.q.passwordOwn },
        ],
        initialValue: 'use',
      }),
    )
    if (choice === 'use') return { password: suggestion, generated: true }
    if (choice === 'own') return { password: await askOwnPassword(ctx), generated: false }
  }
}

async function askOwnPassword(ctx: Context): Promise<string> {
  for (;;) {
    const first = unwrap(
      await p.password({ message: ctx.m.q.passwordEnter, validate: check(ctx, validatePassword) }),
    )
    const second = unwrap(await p.password({ message: ctx.m.q.passwordRepeat }))
    if (first === second) return first
    p.log.warn(ctx.m.q.passwordMismatch)
  }
}

export async function askImprint(ctx: Context, current: string): Promise<string> {
  const flag = flagValue(ctx, 'imprint', validateOptionalUrl)
  if (flag !== undefined) return flag
  if (!ctx.interactive) return current
  const value = unwrap(
    await p.text({
      message: ctx.m.q.imprint,
      placeholder: ctx.m.q.imprintPlaceholder,
      initialValue: current || undefined,
      defaultValue: '',
      validate: check(ctx, validateOptionalUrl),
    }),
  )
  return value.trim()
}
