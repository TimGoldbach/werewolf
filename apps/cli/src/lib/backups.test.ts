import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import {
  backupKind,
  backupName,
  importBackup,
  isBackupFile,
  listBackups,
  retentionDays,
  timestamp,
} from './backups.ts'

describe('backup names', () => {
  it('uses the UTC timestamp format of the nightly dumps', () => {
    const date = new Date(Date.UTC(2026, 9, 29, 8, 5, 9))
    assert.equal(timestamp(date), '20261029-080509')
    assert.equal(backupName('manual', date), 'manual-20261029-080509.sql.gz')
    assert.equal(backupName('pre-update', date), 'pre-update-20261029-080509.sql.gz')
  })

  it('derives the kind from the prefix', () => {
    assert.equal(backupKind('werewolf-20261029-030000.sql.gz'), 'nightly')
    assert.equal(backupKind('manual-20261029-030000.sql.gz'), 'manual')
    assert.equal(backupKind('pre-update-20261029-030000.sql.gz'), 'pre-update')
    assert.equal(backupKind('pre-restore-20261029-030000.sql.gz'), 'pre-restore')
    assert.equal(backupKind('pre-uninstall-20261029-030000.sql.gz'), 'pre-uninstall')
    assert.equal(backupKind('old-server.sql'), 'other')
  })

  it('recognizes plain and gzipped dumps only', () => {
    assert.equal(isBackupFile('a.sql.gz'), true)
    assert.equal(isBackupFile('a.sql'), true)
    assert.equal(isBackupFile('a.sql.gz.partial'), false)
    assert.equal(isBackupFile('notes.txt'), false)
  })
})

describe('listBackups', () => {
  const dir = mkdtempSync(join(tmpdir(), 'werewolf-backups-'))
  const files: [string, number][] = [
    ['werewolf-20261027-030000.sql.gz', 3],
    ['manual-20261028-120000.sql.gz', 1],
    ['pre-update-20261029-080000.sql.gz', 0],
    ['manual-20261029-090000.sql.gz.partial', 0],
    ['readme.txt', 0],
  ]
  for (const [name, daysAgo] of files) {
    const path = join(dir, name)
    writeFileSync(path, 'x'.repeat(name.length))
    const time = new Date(Date.now() - daysAgo * 86_400_000)
    utimesSync(path, time, time)
  }

  it('lists dumps newest first with kind and size', () => {
    const backups = listBackups(dir)
    assert.deepEqual(
      backups.map((b) => [b.name, b.kind]),
      [
        ['pre-update-20261029-080000.sql.gz', 'pre-update'],
        ['manual-20261028-120000.sql.gz', 'manual'],
        ['werewolf-20261027-030000.sql.gz', 'nightly'],
      ],
    )
    assert.equal(backups[0].size, 'pre-update-20261029-080000.sql.gz'.length)
  })

  it('is empty for a missing directory', () => {
    assert.deepEqual(listBackups(join(dir, 'missing')), [])
  })

  it('copies files from elsewhere into the directory under a safe name', () => {
    const outside = mkdtempSync(join(tmpdir(), 'werewolf-import-'))
    const source = join(outside, 'old server (2025).sql.gz')
    writeFileSync(source, 'dump')
    const name = importBackup(source, dir)
    assert.match(name, /^imported-\d{8}-\d{6}-old_server__2025_\.sql\.gz$/)
    assert.equal(existsSync(join(dir, name)), true)
    assert.equal(
      importBackup(join(dir, 'manual-20261028-120000.sql.gz'), dir),
      'manual-20261028-120000.sql.gz',
    )
  })
})

describe('retentionDays', () => {
  it('reads BACKUP_RETENTION_DAYS with a fallback of 14', () => {
    assert.equal(retentionDays({ BACKUP_RETENTION_DAYS: '30' }), 30)
    assert.equal(retentionDays({ BACKUP_RETENTION_DAYS: '' }), 14)
    assert.equal(retentionDays({ BACKUP_RETENTION_DAYS: 'x' }), 14)
    assert.equal(retentionDays({}), 14)
  })
})
