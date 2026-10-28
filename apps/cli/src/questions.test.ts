import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Context, Flags } from './commands/types.ts'
import { messages } from './i18n/index.ts'
import { CliError } from './lib/errors.ts'
import { PASSWORD_PATTERN } from './lib/password.ts'
import {
  askAccent,
  askAccess,
  askGroupName,
  askLogo,
  askPassword,
  askTimeZone,
} from './questions.ts'

/** A non-interactive context, as with --yes. */
function context(flags: Flags): Context {
  const ctx: Context = {
    m: messages.en,
    locale: 'en',
    bin: './werewolf',
    interactive: false,
    flags,
    positionals: [],
    setLocale(locale) {
      ctx.locale = locale
      ctx.m = messages[locale]
    },
  }
  return ctx
}

const current = {
  mode: 'lan',
  domain: '',
  proxyVia: 'port',
  webPort: 8080,
  proxyNetwork: '',
} as const

describe('non-interactive questions', () => {
  it('take values from flags', async () => {
    const ctx = context({ name: ' Kiez ', accent: 'amber', 'time-zone': 'Europe/Berlin' })
    assert.equal(await askGroupName(ctx, ''), 'Kiez')
    assert.equal(await askAccent(ctx, 'violet'), 'amber')
    assert.equal(await askTimeZone(ctx, 'UTC'), 'Europe/Berlin')
  })

  it('fall back to the current value or a default', async () => {
    const ctx = context({})
    assert.equal(await askGroupName(ctx, ''), messages.en.q.defaultGroupName)
    assert.equal(await askAccent(ctx, 'moon'), 'moon')
    assert.deepEqual(await askLogo(ctx, true), { action: 'keep' })
  })

  it('reject invalid flags with the flag name', async () => {
    await assert.rejects(askAccent(context({ accent: 'pink' }), 'violet'), (error: CliError) => {
      assert.match(error.message, /--accent "pink"/)
      return true
    })
    await assert.rejects(askTimeZone(context({ 'time-zone': 'Mars/Base' }), 'UTC'), CliError)
    await assert.rejects(askLogo(context({ logo: '/does/not/exist.svg' }), false), CliError)
  })

  it('"--logo none" removes an existing logo', async () => {
    assert.deepEqual(await askLogo(context({ logo: 'none' }), true), { action: 'remove' })
  })

  it('generate a password unless one is given', async () => {
    assert.match((await askPassword(context({}))).password, PASSWORD_PATTERN)
    assert.deepEqual(await askPassword(context({ password: 'our secret phrase' })), {
      password: 'our secret phrase',
      generated: false,
    })
    await assert.rejects(askPassword(context({ password: 'short' })), CliError)
  })
})

describe('askAccess', () => {
  it('returns only access fields, so other answers are not overwritten', async () => {
    const settings = { ...current, groupName: 'Kiez', accent: 'blood' }
    const access = await askAccess(context({ port: '59111' }), settings)
    assert.deepEqual(access, { ...current, webPort: 59111 })
  })

  it('refuses a proxy network that does not exist, unless forced', async () => {
    const flags = { mode: 'proxy', network: 'werewolf-test-missing-net', domain: 'w.example.org' }
    await assert.rejects(askAccess(context(flags), current), /werewolf-test-missing-net/)
  })

  it('switches to proxy via network when --network is given', async () => {
    const flags = { mode: 'proxy', network: 'traefik', domain: 'W.Example.org', force: true }
    const access = await askAccess(context(flags), current)
    assert.deepEqual(access, {
      mode: 'proxy',
      domain: 'w.example.org',
      proxyVia: 'network',
      webPort: 8080,
      proxyNetwork: 'traefik',
    })
  })

  it('needs --domain for domain mode', async () => {
    await assert.rejects(askAccess(context({ mode: 'domain' }), current), (error: CliError) => {
      assert.match(error.message, /--domain/)
      return true
    })
  })
})
