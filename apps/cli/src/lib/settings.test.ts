import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { type Settings, settingsFromEnv, settingsToEnv } from './settings.ts'

const base: Settings = {
  locale: 'de',
  groupName: 'Kiez',
  tagline: 'Jeden Freitag',
  accent: 'forest',
  mode: 'lan',
  domain: '',
  proxyVia: 'port',
  webPort: 8080,
  proxyNetwork: '',
  timeZone: 'Europe/Berlin',
  imprintUrl: '',
}

describe('settingsToEnv', () => {
  it('lan: port overlay on all interfaces, plain-HTTP cookies', () => {
    const env = settingsToEnv({ ...base, webPort: 8081 })
    assert.equal(env.COMPOSE_FILE, 'docker-compose.yml:compose/port.yml')
    assert.equal(env.WEB_BIND, '0.0.0.0')
    assert.equal(env.WEB_PORT, '8081')
    assert.equal(env.SECURE_COOKIES, 'false')
    assert.equal(env.DEFAULT_LOCALE, 'de')
    assert.equal(env.ACCENT_COLOR, 'forest')
  })

  it('domain: Caddy overlay and secure cookies', () => {
    const env = settingsToEnv({ ...base, mode: 'domain', domain: 'werewolf.example.org' })
    assert.equal(env.COMPOSE_FILE, 'docker-compose.yml:compose/caddy.yml')
    assert.equal(env.DOMAIN, 'werewolf.example.org')
    assert.equal(env.SECURE_COOKIES, 'true')
  })

  it('proxy via port: bound to localhost only', () => {
    const env = settingsToEnv({ ...base, mode: 'proxy', proxyVia: 'port', webPort: 3080 })
    assert.equal(env.COMPOSE_FILE, 'docker-compose.yml:compose/port.yml')
    assert.equal(env.WEB_BIND, '127.0.0.1')
    assert.equal(env.SECURE_COOKIES, 'true')
  })

  it('proxy via network: joins the external network', () => {
    const env = settingsToEnv({
      ...base,
      mode: 'proxy',
      proxyVia: 'network',
      proxyNetwork: 'traefik',
    })
    assert.equal(env.COMPOSE_FILE, 'docker-compose.yml:compose/proxy-network.yml')
    assert.equal(env.PROXY_NETWORK, 'traefik')
  })
})

describe('settingsFromEnv', () => {
  const variants: Settings[] = [
    base,
    { ...base, mode: 'domain', domain: 'werewolf.example.org' },
    { ...base, mode: 'proxy', proxyVia: 'port', webPort: 3080, domain: 'w.example.org' },
    {
      ...base,
      mode: 'proxy',
      proxyVia: 'network',
      proxyNetwork: 'traefik',
      domain: 'w.example.org',
    },
  ]
  for (const settings of variants) {
    it(`round-trips mode ${settings.mode}/${settings.proxyVia}`, () => {
      assert.deepEqual(settingsFromEnv(settingsToEnv(settings)), settings)
    })
  }

  it('falls back to defaults for unknown values', () => {
    const settings = settingsFromEnv({ DEFAULT_LOCALE: 'fr', ACCENT_COLOR: 'pink', WEB_PORT: 'x' })
    assert.equal(settings.locale, 'en')
    assert.equal(settings.accent, 'violet')
    assert.equal(settings.webPort, 8080)
    assert.equal(settings.mode, 'lan')
  })
})
