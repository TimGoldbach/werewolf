import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  PASSWORD_PATTERN,
  generatePassword,
  generateSecret,
  hashPassword,
  verifyPassword,
} from './password.ts'
import { validatePassword } from './validate.ts'

describe('generatePassword', () => {
  it('builds noun-verb-number from the given random source', () => {
    const lowest = (min: number): number => min
    assert.equal(generatePassword('de', lowest), 'vollmond-heult-10')
    assert.equal(generatePassword('en', lowest), 'moon-howls-10')
  })

  it('produces memorable, valid passwords in both languages', () => {
    for (const locale of ['de', 'en'] as const) {
      for (let i = 0; i < 200; i++) {
        const password = generatePassword(locale)
        assert.match(password, PASSWORD_PATTERN)
        assert.equal(validatePassword(password), undefined)
      }
    }
  })

  it('varies', () => {
    const seen = new Set(Array.from({ length: 50 }, () => generatePassword('de')))
    assert.ok(seen.size > 40)
  })
})

describe('hashPassword', () => {
  it('produces a bcrypt hash that verifies', async () => {
    const hash = await hashPassword('vollmond-heult-37')
    assert.match(hash, /^\$2[aby]\$12\$/)
    assert.equal(await verifyPassword('vollmond-heult-37', hash), true)
    assert.equal(await verifyPassword('vollmond-heult-38', hash), false)
  })
})

describe('generateSecret', () => {
  it('is long, URL-safe and random', () => {
    const a = generateSecret()
    assert.match(a, /^[A-Za-z0-9_-]{64}$/)
    assert.notEqual(a, generateSecret())
  })
})
