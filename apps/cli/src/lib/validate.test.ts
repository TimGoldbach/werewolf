import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  normalizeDomain,
  parsePort,
  validateDomain,
  validateGroupName,
  validateNetworkName,
  validateOptionalUrl,
  validatePassword,
  validateTagline,
  validateTimeZone,
} from './validate.ts'

describe('validateDomain', () => {
  for (const ok of [
    'werewolf.example.org',
    'Werewolf.Example.org.',
    'a-b.c.de',
    'localhost',
    'xn--wlfe-jua.de',
  ]) {
    it(`accepts ${ok}`, () => assert.equal(validateDomain(ok), undefined))
  }
  it('rejects a scheme or path', () => {
    assert.equal(validateDomain('https://werewolf.example.org'), 'domainWithScheme')
    assert.equal(validateDomain('werewolf.example.org/app'), 'domainWithScheme')
    assert.equal(validateDomain('werewolf.example.org:8443'), 'domainWithScheme')
  })
  it('rejects malformed names', () => {
    for (const bad of ['-a.example.org', 'a..b', 'under_score.org', 'werewolf', 'space here.org']) {
      assert.equal(validateDomain(bad), 'domain', bad)
    }
  })
  it('requires a value', () => assert.equal(validateDomain('  '), 'required'))
  it('normalizes case and the trailing dot', () => {
    assert.equal(normalizeDomain(' Werewolf.Example.ORG. '), 'werewolf.example.org')
  })
})

describe('ports', () => {
  it('parses valid ports', () => {
    assert.equal(parsePort('8080'), 8080)
    assert.equal(parsePort(' 443 '), 443)
  })
  it('rejects invalid ports', () => {
    for (const bad of ['0', '65536', '80.5', 'http', ''])
      assert.equal(parsePort(bad), undefined, bad)
  })
})

describe('texts', () => {
  it('requires a group name without line breaks', () => {
    assert.equal(validateGroupName(''), 'required')
    assert.equal(validateGroupName('Kiez'), undefined)
    assert.equal(validateGroupName('a\nb'), 'lineBreak')
    assert.equal(validateGroupName('x'.repeat(61)), 'tooLong')
  })
  it('allows an empty tagline', () => {
    assert.equal(validateTagline(''), undefined)
    assert.equal(validateTagline('x'.repeat(121)), 'tooLong')
  })
})

describe('other values', () => {
  it('checks Docker network names', () => {
    assert.equal(validateNetworkName('traefik_default'), undefined)
    assert.equal(validateNetworkName('proxy net'), 'network')
  })
  it('checks IANA time zones', () => {
    assert.equal(validateTimeZone('Europe/Berlin'), undefined)
    assert.equal(validateTimeZone('UTC'), undefined)
    assert.equal(validateTimeZone('Mars/Olympus'), 'timeZone')
  })
  it('accepts an empty or http(s) imprint link', () => {
    assert.equal(validateOptionalUrl(''), undefined)
    assert.equal(validateOptionalUrl('https://example.org/imprint'), undefined)
    assert.equal(validateOptionalUrl('example.org'), 'url')
    assert.equal(validateOptionalUrl('javascript:alert(1)'), 'url')
  })
  it('checks password length in characters and bytes', () => {
    assert.equal(validatePassword('short'), 'passwordShort')
    assert.equal(validatePassword('vollmond-heult-37'), undefined)
    assert.equal(validatePassword('ü'.repeat(37)), 'passwordLong')
  })
})
