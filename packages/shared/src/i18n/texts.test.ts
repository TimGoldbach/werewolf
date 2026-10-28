import { describe, expect, it } from 'vitest'
import { FIRST_NIGHT_RECORD_ORDER, ROLE_CATALOG } from '../domain/roles.js'
import { WIN_CONDITIONS } from '../domain/win-conditions.js'
import { SCRIPTED_ROLE_IDS } from '../engine/script.js'
import { LOCALES } from './locale.js'
import { catalogTexts, scriptTexts } from './texts.js'
import { NARRATION_KEYS } from './types.js'

const sorted = (xs: Iterable<string>) => [...xs].sort()

describe.each(LOCALES)('catalog texts (%s)', (locale) => {
  const texts = catalogTexts(locale)

  it('has a name and description for exactly the catalog roles', () => {
    expect(sorted(Object.keys(texts.roles))).toEqual(sorted(ROLE_CATALOG.map((r) => r.id)))
    for (const [id, role] of Object.entries(texts.roles)) {
      expect(role.name.trim(), id).not.toBe('')
      expect(role.description.trim(), id).not.toBe('')
    }
  })

  it('has unique role names', () => {
    const names = Object.values(texts.roles).map((r) => r.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('describes every win condition', () => {
    for (const wc of WIN_CONDITIONS) {
      expect(texts.winConditions[wc].label.trim(), wc).not.toBe('')
      expect(texts.winConditions[wc].description.trim(), wc).not.toBe('')
    }
  })
})

describe.each(LOCALES)('script texts (%s)', (locale) => {
  const texts = scriptTexts(locale)

  it('covers exactly the scripted and first-night roles', () => {
    expect(sorted(Object.keys(texts.roleLore))).toEqual(sorted(SCRIPTED_ROLE_IDS))
    expect(sorted(Object.keys(texts.firstNightRecord))).toEqual(sorted(FIRST_NIGHT_RECORD_ORDER))
  })

  it('has no empty variants', () => {
    const lists = [
      ...NARRATION_KEYS.map((k) => texts.narration[k]),
      texts.genericWakeLore,
      ...Object.values(texts.roleLore).map((r) => r.lore),
    ]
    for (const list of lists) {
      expect(list.length).toBeGreaterThan(0)
      for (const v of list) expect(v.trim()).not.toBe('')
    }
  })
})

describe('locales stay in step', () => {
  // pickVariant hashes into the list by its length: equal lengths mean the same game
  // tells the same story in every language.
  const [first, ...rest] = LOCALES.map((l) => scriptTexts(l))

  it('has the same number of variants per list', () => {
    for (const other of rest) {
      for (const key of NARRATION_KEYS) {
        expect(other.narration[key].length, key).toBe(first!.narration[key].length)
      }
      expect(other.genericWakeLore.length).toBe(first!.genericWakeLore.length)
      for (const [id, lore] of Object.entries(first!.roleLore)) {
        expect(other.roleLore[id]?.lore.length, id).toBe(lore.lore.length)
      }
    }
  })
})

describe('English texts', () => {
  // Catches German strings left behind when texts are copied over as placeholders.
  const umlaut = /[äöüÄÖÜß„]/

  it('contain no German characters', () => {
    const strings = JSON.stringify([catalogTexts('en'), scriptTexts('en')])
    expect(strings.match(umlaut)?.[0]).toBeUndefined()
  })
})
