import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  changelogBetween,
  compareTags,
  isStableTag,
  newestRelease,
  parseChangelog,
  parseLsRemoteTags,
  parseVersion,
  simplifyChangelogLine,
} from './versions.ts'

describe('parseVersion', () => {
  it('reads release-please tags with and without v', () => {
    assert.deepEqual(parseVersion('v1.2.3'), { major: 1, minor: 2, patch: 3, pre: [] })
    assert.deepEqual(parseVersion('1.2.3'), { major: 1, minor: 2, patch: 3, pre: [] })
    assert.deepEqual(parseVersion('v1.0.0-rc.1'), {
      major: 1,
      minor: 0,
      patch: 0,
      pre: ['rc', '1'],
    })
  })
  it('rejects anything else', () => {
    for (const bad of ['main', 'v1.2', 'release-1.0.0', 'v1.2.3.4', '']) {
      assert.equal(parseVersion(bad), undefined, bad)
    }
  })
})

describe('comparing versions', () => {
  it('orders by major, minor and patch numerically', () => {
    assert.ok(compareTags('v1.10.0', 'v1.9.9') > 0)
    assert.ok(compareTags('v2.0.0', 'v1.99.99') > 0)
    assert.equal(compareTags('v1.2.3', '1.2.3'), 0)
  })
  it('puts pre-releases before their release', () => {
    assert.ok(compareTags('v1.0.0-rc.1', 'v1.0.0') < 0)
    assert.ok(compareTags('v1.0.0-rc.2', 'v1.0.0-rc.10') < 0)
    assert.ok(compareTags('v0.0.1-test', 'v0.0.2-test') < 0)
  })
  it('only treats plain vX.Y.Z as stable', () => {
    assert.equal(isStableTag('v1.0.0'), true)
    assert.equal(isStableTag('v1.0.0-rc.1'), false)
    assert.equal(isStableTag('1.0.0'), false)
  })
})

describe('newestRelease', () => {
  it('picks the highest stable tag', () => {
    const tags = ['v1.2.0', 'v1.10.0', 'v1.9.3', 'v2.0.0-rc.1', 'v0.0.2-test', 'other']
    assert.equal(newestRelease(tags), 'v1.10.0')
  })
  it('is undefined without releases', () => {
    assert.equal(newestRelease(['v0.0.1-test', 'nightly']), undefined)
    assert.equal(newestRelease([]), undefined)
  })
})

describe('parseLsRemoteTags', () => {
  it('reads tag names and folds peeled refs', () => {
    const output = [
      'a1\trefs/tags/v1.0.0',
      'b2\trefs/tags/v1.0.0^{}',
      'c3\trefs/tags/v1.1.0',
      'd4\trefs/heads/main',
      '',
    ].join('\n')
    assert.deepEqual(parseLsRemoteTags(output), ['v1.0.0', 'v1.1.0'])
  })
})

// The format release-please writes.
const CHANGELOG = `# Changelog

## [1.2.0](https://github.com/TimGoldbach/werewolf/compare/v1.1.0...v1.2.0) (2026-12-01)


### Features

* **cli:** backups on demand ([#12](https://github.com/TimGoldbach/werewolf/issues/12)) ([abc1234](https://github.com/TimGoldbach/werewolf/commit/abc1234def))

## [1.1.0](https://github.com/TimGoldbach/werewolf/compare/v1.0.0...v1.1.0) (2026-11-15)


### Bug Fixes

* login works with long passwords ([0123abc](https://github.com/TimGoldbach/werewolf/commit/0123abcdef))

## 1.0.0 (2026-10-30)


### Features

* first release
`

describe('changelog', () => {
  it('parses release-please entries', () => {
    const entries = parseChangelog(CHANGELOG)
    assert.deepEqual(
      entries.map((e) => [e.version, e.date]),
      [
        ['1.2.0', '2026-12-01'],
        ['1.1.0', '2026-11-15'],
        ['1.0.0', '2026-10-30'],
      ],
    )
    assert.match(entries[0].body, /backups on demand/)
  })

  it('returns the entries after the installed version up to the target, newest first', () => {
    assert.deepEqual(
      changelogBetween(CHANGELOG, 'v1.0.0', 'v1.2.0').map((e) => e.version),
      ['1.2.0', '1.1.0'],
    )
    assert.deepEqual(
      changelogBetween(CHANGELOG, 'v1.0.0', 'v1.1.0').map((e) => e.version),
      ['1.1.0'],
    )
    assert.deepEqual(changelogBetween(CHANGELOG, 'v1.2.0', 'v1.2.0'), [])
  })

  it('shows only the target entry when the installed version is unknown', () => {
    assert.deepEqual(
      changelogBetween(CHANGELOG, undefined, 'v1.1.0').map((e) => e.version),
      ['1.1.0'],
    )
  })

  it('simplifies links for the terminal', () => {
    assert.equal(
      simplifyChangelogLine(
        '* **cli:** backups on demand ([#12](https://x/issues/12)) ([abc1234](https://x/commit/abc1234def))',
      ),
      '• **cli:** backups on demand (#12)',
    )
  })
})
