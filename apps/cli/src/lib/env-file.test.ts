import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { formatValue, parseEnv, parseValue, renderInstanceEnv, updateEnv } from './env-file.ts'
import { REPO_ROOT } from './paths.ts'

describe('formatValue / parseValue', () => {
  const roundTrip = [
    'plain',
    '',
    'docker-compose.yml:compose/caddy.yml',
    'https://example.org/imprint?a=1&b=2',
    '$2b$12$abcdefghijklmnopqrstuuJ4Ylq9vAo0SxJm8M0u6HR5D.K5qbWV6',
    'Full Moon Society',
    "Wolves' Den",
    'He said "howl" for $5 \\o/',
    'Vollmond-Verein # nicht kommentieren',
    'Ümlaut & ß',
  ]

  for (const value of roundTrip) {
    it(`round-trips ${JSON.stringify(value)}`, () => {
      assert.equal(parseValue(formatValue(value)), value)
    })
  }

  it('leaves simple values unquoted', () => {
    assert.equal(formatValue('violet'), 'violet')
    assert.equal(formatValue('Europe/Berlin'), 'Europe/Berlin')
  })

  it('single-quotes values with $ so compose does not interpolate them', () => {
    assert.equal(formatValue('$2b$12$x'), "'$2b$12$x'")
  })

  it('falls back to double quotes with escaped $ when a single quote is present', () => {
    assert.equal(formatValue(`it's $5`), `"it's $$5"`)
  })

  it('rejects line breaks', () => {
    assert.throws(() => formatValue('a\nb'))
  })

  it('reads the dialects compose understands', () => {
    assert.equal(parseValue('plain value # comment'), 'plain value')
    assert.equal(parseValue(`'single # kept'`), 'single # kept')
    assert.equal(parseValue(`"a \\"b\\" $$c"`), 'a "b" $c')
    assert.equal(parseValue('a$$b'), 'a$b')
  })
})

describe('parseEnv', () => {
  it('reads assignments and ignores comments and blank lines', () => {
    const env = parseEnv(
      ['# comment', '', 'A=1', 'export B="two words"', '  C = spaced  '].join('\n'),
    )
    assert.deepEqual(env, { A: '1', B: 'two words', C: 'spaced' })
  })
})

describe('updateEnv', () => {
  it('replaces values in place and keeps comments', () => {
    const text = [
      '# Database',
      'POSTGRES_PASSWORD=change-me',
      '',
      '# Name',
      'GROUP_NAME=',
      '',
    ].join('\n')
    const updated = updateEnv(text, { GROUP_NAME: 'Full Moon Society', POSTGRES_PASSWORD: 'x' })
    assert.equal(
      updated,
      [
        '# Database',
        'POSTGRES_PASSWORD=x',
        '',
        '# Name',
        "GROUP_NAME='Full Moon Society'",
        '',
      ].join('\n'),
    )
  })

  it('appends keys that are not in the file yet', () => {
    const updated = updateEnv('A=1\n', { B: '2' })
    assert.equal(updated, 'A=1\n\nB=2\n')
  })
})

describe('renderInstanceEnv', () => {
  const template = readFileSync(join(REPO_ROOT, '.env.example'), 'utf8')
  const rendered = renderInstanceEnv(template, {
    COMPOSE_FILE: 'docker-compose.yml:compose/caddy.yml',
    DOMAIN: 'werewolf.example.org',
    GATE_PASSWORD: '',
    GATE_PASSWORD_HASH: '$2b$12$hash',
    GROUP_NAME: "Wolves' Den",
  })
  const env = parseEnv(rendered)

  it('sets the given values', () => {
    assert.equal(env.COMPOSE_FILE, 'docker-compose.yml:compose/caddy.yml')
    assert.equal(env.DOMAIN, 'werewolf.example.org')
    assert.equal(env.GATE_PASSWORD, '')
    assert.equal(env.GATE_PASSWORD_HASH, '$2b$12$hash')
    assert.equal(env.GROUP_NAME, "Wolves' Den")
  })

  it('keeps the template defaults for everything else', () => {
    assert.equal(env.POSTGRES_USER, 'werewolf')
    assert.equal(env.SESSION_TTL, '30d')
  })

  it('drops the local-development section', () => {
    assert.equal(env.DATABASE_URL, undefined)
    assert.equal(env.API_INTERNAL_URL, undefined)
    assert.doesNotMatch(rendered, /Local development only/)
  })

  it('replaces the template header with its own', () => {
    assert.doesNotMatch(rendered, /^# Template for/m)
    assert.match(rendered, /^# Configuration of this werewolf instance/)
  })
})
