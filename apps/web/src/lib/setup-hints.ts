import {
  getRole,
  roleName,
  ROLE_CATALOG,
  type CatalogTexts,
  type RoleCategory,
  type RoleDef,
} from '@werewolf/shared'
import { useTranslations } from 'next-intl'
import { useCatalog } from '@/lib/texts'
import type { GameListItem } from '@/lib/types'
import type { Formatter } from '@/lib/utils'

/**
 * Shortcuts for setting up a game, derived from the group's previous games: who plays
 * regularly, which line-ups were used recently, which roles are popular. All just
 * convenience — the form also works without them (empty history).
 */
export interface SetupHints {
  /** Player ids, regulars first (participations in the most recent games) */
  playerOrder: string[]
  recentLineups: RecentLineup[]
  /** Role quick-pick shown before the full catalog, already in display order */
  favoriteRoles: string[]
}

/** An earlier line-up that can be reused with a single tap. */
export interface RecentLineup {
  gameId: string
  playedAt: string
  playerIds: string[]
  moderatorId: string | null
}

export const EMPTY_SETUP_HINTS: SetupHints = {
  playerOrder: [],
  recentLineups: [],
  favoriteRoles: [],
}

export const VILLAGER_ROLE_ID = 'villager'
export const WEREWOLF_ROLE_ID = 'werewolf'

/** The two "filler roles" are always in the quick-pick, each at the front of its category. */
const FILLER_ROLES = [WEREWOLF_ROLE_ID, VILLAGER_ROLE_ID]

/** Classics for groups without (enough) history. */
const CLASSIC_ROLES = [
  'seer',
  'witch',
  'hunter',
  'cupid',
  'healer',
  'elder',
  'little-girl',
  'wild-child',
  'pied-piper',
  'white-werewolf',
]

const FAVORITE_LIMIT = 12
/** How far back "regular player" and "popular role" are counted. */
const PLAYER_WINDOW = 20
const ROLE_WINDOW = 30
const RECENT_LIMIT = 3

const CATEGORY_ORDER: RoleCategory[] = ['werewolves', 'villagers', 'ambiguous', 'loners']
const CATALOG_INDEX = new Map(ROLE_CATALOG.map((r, i) => [r.id, i]))

/** Short names of the two filler roles, per language (the `gameSetup.shortRole` messages). */
export type ShortRoleLabels = Record<string, string>

/** Short name for tiles/chips: just "Werewolf" instead of the full catalog name (filler roles only). */
export function roleLabel(catalog: CatalogTexts, shortLabels: ShortRoleLabels, roleId: string): string {
  return shortLabels[roleId] ?? roleName(catalog, roleId)
}

/** `roleLabel` in the active language, for components. */
export function useRoleLabel(): (roleId: string) => string {
  const catalog = useCatalog()
  const t = useTranslations('gameSetup.shortRole')
  const shortLabels: ShortRoleLabels = { [WEREWOLF_ROLE_ID]: t('werewolf'), [VILLAGER_ROLE_ID]: t('villager') }
  return (roleId) => roleLabel(catalog, shortLabels, roleId)
}

/**
 * Sorts roles the way moderators think about a deck: wolves first, then village, then the rest;
 * the filler role first, then by popularity, otherwise catalog order.
 */
export function sortRoles(roleIds: string[], popularity: Map<string, number> = new Map()): string[] {
  const key = (id: string) => {
    const role = getRole(id)
    const category = role ? CATEGORY_ORDER.indexOf(role.category) : CATEGORY_ORDER.length
    return [category, FILLER_ROLES.includes(id) ? 0 : 1, -(popularity.get(id) ?? 0), CATALOG_INDEX.get(id) ?? 1e9]
  }
  return [...roleIds].sort((a, b) => {
    const ka = key(a)
    const kb = key(b)
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i]! - kb[i]!
    return 0
  })
}

/** @param hiddenRoleIds roles the group has hidden — never offered in the quick-pick */
export function buildSetupHints(games: GameListItem[], hiddenRoleIds: string[] = []): SetupHints {
  const hidden = new Set(hiddenRoleIds)
  const sorted = [...games].sort((a, b) => b.playedAt.localeCompare(a.playedAt))

  // Regulars: participations in the most recent games, ties broken by who played most recently.
  const playCount = new Map<string, number>()
  const lastSeen = new Map<string, number>()
  sorted.slice(0, PLAYER_WINDOW).forEach((g, i) => {
    for (const p of g.players) {
      playCount.set(p.player.id, (playCount.get(p.player.id) ?? 0) + 1)
      if (!lastSeen.has(p.player.id)) lastSeen.set(p.player.id, i)
    }
  })
  const playerOrder = [...playCount.keys()].sort(
    (a, b) => playCount.get(b)! - playCount.get(a)! || lastSeen.get(a)! - lastSeen.get(b)!,
  )

  const recentLineups: RecentLineup[] = []
  const seenLineups = new Set<string>()
  for (const g of sorted) {
    if (recentLineups.length >= RECENT_LIMIT) break
    const playerIds = g.players.map((p) => p.player.id)
    if (playerIds.length < 3) continue
    const key = [...playerIds].sort().join(',')
    if (seenLineups.has(key)) continue
    seenLineups.add(key)
    recentLineups.push({ gameId: g.id, playedAt: g.playedAt, playerIds, moderatorId: g.moderator?.id ?? null })
  }

  // Popular = in how many of the recent games the role appeared (not how often — otherwise
  // the filler roles, which are always included anyway, would always win).
  const popularity = new Map<string, number>()
  for (const g of sorted.slice(0, ROLE_WINDOW)) {
    for (const roleId of new Set(g.players.map((p) => p.roleId))) {
      if (roleId && getRole(roleId)) popularity.set(roleId, (popularity.get(roleId) ?? 0) + 1)
    }
  }
  const played = [...popularity.keys()]
    .filter((id) => !FILLER_ROLES.includes(id))
    .sort((a, b) => popularity.get(b)! - popularity.get(a)!)
  const picked = [...FILLER_ROLES, ...played].filter((id) => !hidden.has(id)).slice(0, FAVORITE_LIMIT)
  for (const id of CLASSIC_ROLES) {
    if (picked.length >= FAVORITE_LIMIT) break
    if (!picked.includes(id) && !hidden.has(id)) picked.push(id)
  }

  return { playerOrder, recentLineups, favoriteRoles: sortRoles(picked, popularity) }
}

/**
 * Common rule of thumb for the number of werewolves: 8–11 players → 2, 12–17 → 3, 18 and up → 4.
 * There is no recommendation for fewer than 8 players.
 */
export function suggestedWolves(players: number): { count: number } | null {
  if (players < 8) return null
  return { count: players <= 11 ? 2 : players <= 17 ? 3 : 4 }
}

/**
 * "Today", "Yesterday" or a short weekday date like "Mon, 10/06" / "Mo., 06.10.". The words come from the
 * caller (`common.today` / `common.yesterday`), the date from the next-intl formatter.
 */
export function shortDay(
  iso: string,
  format: Formatter,
  labels: { today: string; yesterday: string },
): string {
  const d = new Date(iso)
  const today = new Date()
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((startOf(today) - startOf(d)) / 86_400_000)
  if (diff === 0) return labels.today
  if (diff === 1) return labels.yesterday
  return format.dateTime(d, { weekday: 'short', day: '2-digit', month: '2-digit' })
}

export type FactionKey = RoleDef['faction']

/** Colour code per faction (matches the badge variants). */
export const FACTION_TONE: Record<FactionKey, { dot: string }> = {
  werewolves: { dot: 'bg-red-400' },
  village: { dot: 'bg-sky-400' },
  solo: { dot: 'bg-amber-400' },
  variable: { dot: 'bg-violet-400' },
}
