import { randomBytes, randomInt } from 'node:crypto'
import bcrypt from 'bcryptjs'
import type { Locale } from './settings.ts'

// Memorable group passwords like "vollmond-heult-37": a noun, a verb and a two-digit number.
// ASCII only, so they are easy to type on any phone keyboard.
// prettier-ignore
const WORDS: Record<Locale, { nouns: string[]; verbs: string[] }> = {
  de: {
    nouns: [
      'vollmond', 'wolf', 'hexe', 'seherin', 'dorf', 'nebel', 'eule', 'rabe',
      'mond', 'nacht', 'fackel', 'amor', 'hirte', 'ritter', 'engel', 'dieb',
      'wache', 'kerze', 'glocke', 'sturm', 'schatten', 'rudel', 'fuchs', 'laterne',
      'geist', 'wanderer', 'prinz', 'magd', 'kater', 'orakel', 'jagdhund', 'kauz',
    ],
    verbs: [
      'heult', 'schleicht', 'lauert', 'wacht', 'tanzt', 'jagt', 'brennt', 'lacht',
      'ruft', 'wandert', 'blinzelt', 'knurrt', 'zaubert', 'schweigt', 'rennt', 'singt',
      'lauscht', 'wittert', 'spukt', 'grollt', 'funkelt', 'raunt', 'zittert', 'tobt',
      'flieht', 'erwacht', 'wartet', 'kichert', 'staunt', 'gruselt', 'schnurrt', 'pfeift',
    ],
  },
  en: {
    nouns: [
      'moon', 'wolf', 'witch', 'seer', 'village', 'fog', 'owl', 'raven',
      'night', 'torch', 'cupid', 'hunter', 'knight', 'angel', 'thief', 'guard',
      'candle', 'bell', 'storm', 'shadow', 'pack', 'fox', 'lantern', 'ghost',
      'wanderer', 'elder', 'prince', 'maid', 'cat', 'oracle', 'hound', 'bear',
    ],
    verbs: [
      'howls', 'prowls', 'lurks', 'watches', 'whispers', 'dances', 'hunts', 'sleeps',
      'dreams', 'burns', 'laughs', 'calls', 'wanders', 'blinks', 'growls', 'sings',
      'listens', 'sniffs', 'haunts', 'rumbles', 'glows', 'sparkles', 'murmurs', 'trembles',
      'roars', 'hides', 'wakes', 'waits', 'creeps', 'flees', 'rises', 'giggles',
    ],
  },
}

export type RandomInt = (min: number, max: number) => number

/** Generates a password like "vollmond-heult-37"; `random(min, max)` returns an int in [min, max). */
export function generatePassword(locale: Locale, random: RandomInt = randomInt): string {
  const { nouns, verbs } = WORDS[locale]
  const noun = nouns[random(0, nouns.length)]
  const verb = verbs[random(0, verbs.length)]
  return `${noun}-${verb}-${random(10, 100)}`
}

export const PASSWORD_PATTERN = /^[a-z]+-[a-z]+-\d{2}$/

export const BCRYPT_ROUNDS = 12

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/** URL-safe random secret (safe inside DATABASE_URL and unquoted in .env). */
export function generateSecret(bytes = 48): string {
  return randomBytes(bytes).toString('base64url')
}
