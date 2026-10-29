import { describe, expect, it } from 'vitest'
import { ARCHETYPES, isArchetype } from './archetypes.js'
import { FACTIONS } from './factions.js'
import {
  CLASSIC_ROLE_IDS,
  FIRST_NIGHT_ORDER,
  getRole,
  REGULAR_NIGHT_ORDER,
  ROLE_CATALOG,
  ROLE_CATEGORIES,
  type RoleCategory,
} from './roles.js'
import { WIN_CONDITION_DEFS, WIN_CONDITIONS } from './win-conditions.js'

const CATEGORIES: readonly RoleCategory[] = ROLE_CATEGORIES

describe('ROLE_CATALOG integrity', () => {
  it('has unique, kebab-case IDs', () => {
    const ids = ROLE_CATALOG.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(id, `"${id}" is not kebab-case`).toMatch(/^[a-z][a-z0-9-]*$/)
    }
  })

  it('uses only valid factions and categories', () => {
    for (const r of ROLE_CATALOG) {
      expect(FACTIONS).toContain(r.faction)
      expect(CATEGORIES).toContain(r.category)
    }
  })

  it('references only existing archetypes', () => {
    for (const r of ROLE_CATALOG) {
      expect(r.archetypes.length, `${r.id} has no archetypes`).toBeGreaterThan(0)
      for (const a of r.archetypes) {
        expect(isArchetype(a), `${r.id}: unknown archetype "${a}"`).toBe(true)
      }
    }
  })

  it('every archetype is used — except the documented reserved ones', () => {
    // Reserved archetypes: for roles planned in DESIGN.md §5 but not (yet) in the
    // catalog (Raven, Judge, Scapegoat, Juggler). Everything else must be
    // referenced by at least one role — so an accidentally introduced building
    // block that is used nowhere stands out immediately.
    const RESERVED = new Set(['day-vote-extra', 'day-second-vote', 'day-tie-decider', 'role-thief'])
    const used = new Set(ROLE_CATALOG.flatMap((r) => r.archetypes))
    const orphans = ARCHETYPES.filter((a) => !used.has(a) && !RESERVED.has(a))
    expect(orphans, `unused, non-reserved archetypes: ${orphans.join(', ')}`).toEqual([])
  })

  it('keeps the wake fields consistent (night-active ⇒ wakeOrder set; otherwise null)', () => {
    for (const r of ROLE_CATALOG) {
      if (r.wakesAtNight) {
        expect(r.wakeOrder, `${r.id} is night-active but has no wakeOrder`).not.toBeNull()
      } else {
        expect(r.wakeOrder, `${r.id} is not night-active but has a wakeOrder`).toBeNull()
        expect(r.wakeEveryNight).toBe(false)
        expect(r.firstNightOnly).toBe(false)
      }
    }
  })

  it('still contains all classic base roles (stable IDs)', () => {
    expect(new Set(CLASSIC_ROLE_IDS).size).toBe(CLASSIC_ROLE_IDS.length)
    for (const id of CLASSIC_ROLE_IDS) {
      expect(getRole(id), `Role "${id}" is missing from the catalog`).toBeDefined()
    }
  })
})

describe('wake order', () => {
  it('contains every night-active role on the first night', () => {
    const nightRoles = ROLE_CATALOG.filter((r) => r.wakesAtNight).map((r) => r.id)
    for (const id of nightRoles) expect(FIRST_NIGHT_ORDER).toContain(id)
    expect(FIRST_NIGHT_ORDER.length).toBe(nightRoles.length)
  })

  it('omits the pure setup roles (firstNightOnly) on later nights', () => {
    const regular = ROLE_CATALOG.filter((r) => r.wakesAtNight && !r.firstNightOnly).map((r) => r.id)
    for (const id of regular) expect(REGULAR_NIGHT_ORDER).toContain(id)
    expect(REGULAR_NIGHT_ORDER.length).toBe(regular.length)
    for (const r of ROLE_CATALOG) {
      if (r.firstNightOnly) expect(REGULAR_NIGHT_ORDER).not.toContain(r.id)
    }
  })

  it('only real catalog IDs appear in the orders', () => {
    for (const id of [...FIRST_NIGHT_ORDER, ...REGULAR_NIGHT_ORDER]) {
      expect(getRole(id), `Order references unknown role "${id}"`).toBeDefined()
    }
  })

  it('is sorted ascending by wakeOrder', () => {
    const orders = FIRST_NIGHT_ORDER.map((id) => getRole(id)!.wakeOrder!)
    for (let i = 1; i < orders.length; i++) expect(orders[i]).toBeGreaterThanOrEqual(orders[i - 1]!)
  })

  it('wakes the classic roles in canonical order (Cupid → Wolf → Witch → Seer)', () => {
    const idx = (id: string) => FIRST_NIGHT_ORDER.indexOf(id)
    expect(idx('cupid')).toBeLessThan(idx('werewolf'))
    expect(idx('werewolf')).toBeLessThan(idx('witch'))
    expect(idx('witch')).toBeLessThan(idx('seer'))
  })
})

describe('win conditions', () => {
  it('every WIN_CONDITION has a complete definition', () => {
    for (const wc of WIN_CONDITIONS) {
      const def = WIN_CONDITION_DEFS[wc]
      expect(def, `WinCondition "${wc}" without a definition`).toBeDefined()
      expect(def.id).toBe(wc)
    }
  })

  it('WIN_CONDITION_DEFS contains no extra keys without an enum entry', () => {
    for (const key of Object.keys(WIN_CONDITION_DEFS)) {
      expect(WIN_CONDITIONS as readonly string[]).toContain(key)
    }
  })
})
