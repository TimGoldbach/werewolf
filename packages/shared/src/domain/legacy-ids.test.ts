import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DEATH_CAUSES } from '../dto/game.js'
import { FACTIONS } from './factions.js'
import {
  LEGACY_CATALOG_VERSION,
  LEGACY_DEATH_CAUSES,
  LEGACY_FACTIONS,
  LEGACY_ROLE_CATEGORIES,
  LEGACY_ROLE_IDS,
  LEGACY_WIN_CONDITIONS,
} from './legacy-ids.js'
import { ROLE_CATALOG, ROLE_CATALOG_VERSION, ROLE_CATEGORIES } from './roles.js'
import { WIN_CONDITIONS } from './win-conditions.js'

const MIGRATION = new URL(
  '../../../../apps/api/prisma/migrations/20261028120000_english_ids/migration.sql',
  import.meta.url,
)

/** The mapping must hit every current id exactly once, so no legacy value is left behind. */
function expectBijection(mapping: Record<string, string>, current: readonly string[]) {
  const targets = Object.values(mapping)
  expect(new Set(targets).size).toBe(targets.length)
  expect([...targets].sort()).toEqual([...current].sort())
}

describe('legacy id mapping', () => {
  it('maps every role exactly once', () => {
    expectBijection(
      LEGACY_ROLE_IDS,
      ROLE_CATALOG.map((r) => r.id),
    )
  })

  it('maps every faction, category, death cause and win condition exactly once', () => {
    expectBijection(LEGACY_FACTIONS, FACTIONS)
    expectBijection(LEGACY_ROLE_CATEGORIES, ROLE_CATEGORIES)
    expectBijection(LEGACY_DEATH_CAUSES, DEATH_CAUSES)
    expectBijection(LEGACY_WIN_CONDITIONS, WIN_CONDITIONS)
    expect(Object.values(LEGACY_CATALOG_VERSION)).toEqual([ROLE_CATALOG_VERSION])
  })

  it('keeps solo win conditions equal to the id of the role that wins', () => {
    const roles: Record<string, string> = LEGACY_ROLE_IDS
    for (const [old, renamed] of Object.entries(LEGACY_WIN_CONDITIONS)) {
      if (old in roles) expect(renamed, old).toBe(roles[old])
    }
  })

  it('is embedded unchanged in the data migration', () => {
    const sql = readFileSync(MIGRATION, 'utf8')
    const persisted = {
      ...LEGACY_ROLE_IDS,
      ...LEGACY_FACTIONS,
      ...LEGACY_DEATH_CAUSES,
      ...LEGACY_WIN_CONDITIONS,
      ...LEGACY_CATALOG_VERSION,
    }
    for (const [old, renamed] of Object.entries(persisted)) {
      if (old !== renamed) expect(sql).toContain(`('${old}', '${renamed}')`)
    }
  })
})
