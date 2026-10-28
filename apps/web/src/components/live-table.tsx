'use client'

import {
  DEATH_CAUSES,
  deathCauseLabel,
  getRole,
  ROLE_CATALOG,
  roleName,
  roleText,
  werewolfVictimId,
  whoreInWolfDenId,
  type DeathCause,
  type EngineState,
  type Faction,
  type RoleCategory,
} from '@werewolf/shared'
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { useTranslations } from 'next-intl'
import { Icon, RoleIcon } from '@/components/pixel/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useCatalog } from '@/lib/texts'
import type { LivePlayerState, LiveState } from '@/lib/types'
import { cn } from '@/lib/utils'

const CATEGORY_ORDER: RoleCategory[] = ['werewolves', 'villagers', 'ambiguous', 'loners']

function factionVariant(f: string): 'village' | 'werewolves' | 'solo' | 'muted' {
  return f === 'werewolves' ? 'werewolves' : f === 'solo' ? 'solo' : f === 'village' ? 'village' : 'muted'
}

/** Small status chip. */
function Chip({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'danger' | 'info' }) {
  return (
    <span
      className={cn(
        'rounded px-1.5 py-0.5 text-[10px] font-medium leading-none',
        tone === 'danger' && 'bg-destructive/25 text-destructive',
        tone === 'info' && 'bg-sky-500/15 text-sky-300',
        tone === 'muted' && 'bg-muted text-muted-foreground',
      )}
    >
      {children}
    </span>
  )
}

/** Moderator correction for a player: role and/or alive/dead status (changed fields only). */
export interface PlayerCorrection {
  roleId?: string
  alive?: boolean
  cause?: DeathCause
}

/**
 * Moderator overview of all players: role, side/faction, status and alive/dead —
 * in plain text. (Moderator-only view: while the village is awake, the console shows
 * it only on request — see the spoiler protection in live-console.tsx.)
 *
 * If `onCorrect` is set, a long press lets you correct a player's role AND their
 * alive/dead status — e.g. if the moderator slipped up while dealing the cards or a
 * death needs to be added/undone.
 */
export function LiveTable({
  state,
  onCorrect,
  busy = false,
}: {
  state: LiveState
  onCorrect?: (playerId: string, patch: PlayerCorrection) => void
  busy?: boolean
}) {
  const t = useTranslations('liveTable')
  const [editing, setEditing] = useState<LivePlayerState | null>(null)

  const nameOf = (id: string | null) =>
    state.players.find((p) => p.playerId === id)?.displayName ?? '—'

  // Living first, then dead; alphabetical within each group — as a stable reference list.
  const players = [...state.players].sort(
    (a, b) => Number(b.alive) - Number(a.alive) || a.displayName.localeCompare(b.displayName),
  )
  const aliveCount = players.filter((p) => p.alive).length

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 font-semibold">
          <Icon name={state.phase === 'night' ? 'moon' : state.phase === 'day' ? 'sun' : 'star'} size={16} />
          {t('overview', { alive: aliveCount, total: players.length })}
        </span>
        <span>{state.round > 0 ? t('round', { round: state.round }) : t('setup')}</span>
      </div>

      <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
        {players.map((p) => (
          <PlayerRow
            key={p.playerId}
            p={p}
            state={state}
            nameOf={nameOf}
            onLongPress={onCorrect ? () => setEditing(p) : undefined}
          />
        ))}
      </ul>

      {onCorrect && (
        <p className="text-[11px] text-muted-foreground">
          {t('longPressTip')}
        </p>
      )}

      {editing && onCorrect && (
        <EditRoleModal
          player={editing}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            onCorrect(editing.playerId, patch)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function PlayerRow({
  p,
  state,
  nameOf,
  onLongPress,
}: {
  p: LivePlayerState
  state: LiveState
  nameOf: (id: string | null) => string
  onLongPress?: () => void
}) {
  const t = useTranslations('liveTable')
  const catalog = useCatalog()
  const longPress = useLongPress(onLongPress)
  const role = p.roleId ? getRole(p.roleId) : undefined
  // Harlot in the wolf den: she gets eaten, not the chosen victim.
  const isVictim =
    p.alive &&
    (werewolfVictimId(state as unknown as EngineState) === p.playerId ||
      state.pendingExtraVictimId === p.playerId)
  const isWolfTarget = p.alive && state.pendingWhiteWolfKillId === p.playerId
  const isPoisoned = p.alive && state.poisonedId === p.playerId
  const isProtected = p.alive && state.protectedId === p.playerId
  const mustShoot = p.alive && state.pendingHunterId === p.playerId
  const isRustyInfected = p.alive && state.rustyInfectedId === p.playerId
  const isBlocked = p.alive && state.blockedId === p.playerId
  const isWhoreVisiting = p.alive && p.roleId === 'harlot' && state.whoreHostId != null
  const isInWolfDen = isWhoreVisiting && whoreInWolfDenId(state as unknown as EngineState) === p.playerId
  // Gull hits persist for the whole game — even beyond death.
  const isGullMarked = state.gullMarkedIds.includes(p.playerId)
  const isPoet = p.alive && state.poetId === p.playerId

  return (
    <li
      {...longPress.handlers}
      title={onLongPress ? t('longPressTitle') : undefined}
      className={cn(
        'flex flex-col gap-1 px-2.5 py-2',
        !p.alive && 'bg-muted/30',
        onLongPress && 'cursor-pointer select-none active:bg-muted/50',
      )}
    >
      {/* Header row: player + alive/dead */}
      <div className="flex items-center gap-2">
        {p.roleId ? (
          <RoleIcon roleId={p.roleId} size={22} className={cn(!p.alive && 'opacity-30 grayscale')} />
        ) : (
          <Icon name="person" size={22} className={cn('opacity-40', !p.alive && 'opacity-20 grayscale')} />
        )}
        <span className="flex min-w-0 flex-1 items-center gap-1">
          <span className={cn('truncate text-sm font-semibold', !p.alive && 'text-muted-foreground line-through')}>
            {p.displayName}
          </span>
          {/* Gull: permanent mark right next to the name — unlike the night status chips
              below, it persists for the whole game. Deliberately next to (not inside)
              the truncating name span so it stays visible even for long names. */}
          {isGullMarked && (
            <span className="shrink-0 text-xs" title={t('gullMarked')} aria-label={t('gullMarked')}>
              💩
            </span>
          )}
        </span>
        {p.isCaptain && (
          <span className="flex items-center gap-0.5 text-[10px] font-medium text-amber-300">
            <Icon name="crown" size={12} /> {t('mayor')}
          </span>
        )}
        {p.alive ? (
          <span className="text-[10px] font-semibold text-emerald-400">{t('alive')}</span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
            <Icon name="skull" size={12} />†{p.diedRound != null ? ` ${t('diedRound', { round: p.diedRound })}` : ''}
            {p.deathCause ? ` · ${deathCauseLabel(catalog, p.deathCause)}` : ''}
          </span>
        )}
      </div>

      {/* Role + side + status */}
      <div className="flex flex-wrap items-center gap-1.5 pl-7">
        {role ? (
          <span className="text-xs">{roleName(catalog, role.id)}</span>
        ) : (
          <span className="text-xs italic text-muted-foreground">{t('roleOpen')}</span>
        )}
        {role && (
          <Badge variant={factionVariant(p.faction)} className="px-1.5 py-0 text-[10px]">
            {catalog.factions[p.faction as Faction] ?? p.faction}
          </Badge>
        )}

        {p.loverId && <Chip tone="info">{t('chips.loverWith', { name: nameOf(p.loverId) })}</Chip>}
        {p.charmed && <Chip tone="info">{t('chips.charmed')}</Chip>}
        {p.extraLife && <Chip>{t('chips.extraLife')}</Chip>}
        {p.modelId && <Chip>{t('chips.model', { name: nameOf(p.modelId) })}</Chip>}

        {isVictim && <Chip tone="danger">{t('chips.wolfVictim')}</Chip>}
        {isWolfTarget && <Chip tone="danger">{t('chips.whiteWolfTarget')}</Chip>}
        {isPoisoned && <Chip tone="danger">{t('chips.poisoned')}</Chip>}
        {isProtected && <Chip tone="info">{t('chips.protected')}</Chip>}
        {mustShoot && <Chip tone="danger">{t('chips.hunterShoots')}</Chip>}
        {isRustyInfected && <Chip tone="danger">{t('chips.rustyBlade')}</Chip>}
        {isBlocked && <Chip tone="info">🚫 {t('chips.blocked')}</Chip>}
        {isPoet && <Chip tone="info">{t('chips.poet')}</Chip>}
        {isWhoreVisiting && (
          <Chip tone="info">
            {t(isInWolfDen ? 'chips.harlotInDen' : 'chips.harlotSafe', { name: nameOf(state.whoreHostId) })}
          </Chip>
        )}
      </div>
    </li>
  )
}

/**
 * Long-press detection for touch and mouse: after ~500 ms without significant movement
 * `onLongPress` fires. Scrolling/swiping (> 10 px) cancels it; the native context menu
 * is suppressed so that holding does not accidentally select text or open a menu.
 */
function useLongPress(onLongPress?: () => void, ms = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const fired = useRef(false)

  const cancel = () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    origin.current = null
  }

  if (!onLongPress) return { handlers: {} as Record<string, never> }

  return {
    handlers: {
      onPointerDown: (e: ReactPointerEvent) => {
        fired.current = false
        origin.current = { x: e.clientX, y: e.clientY }
        timer.current = setTimeout(() => {
          fired.current = true
          onLongPress()
        }, ms)
      },
      onPointerMove: (e: ReactPointerEvent) => {
        if (!origin.current) return
        if (
          Math.abs(e.clientX - origin.current.x) > 10 ||
          Math.abs(e.clientY - origin.current.y) > 10
        )
          cancel()
      },
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onContextMenu: (e: ReactMouseEvent) => {
        // Only suppress if the long press actually fired.
        if (fired.current) e.preventDefault()
      },
    },
  }
}

/**
 * Correct a player: role (picked from the complete role catalog, grouped by category)
 * AND alive/dead status. On save only the changed fields are reported; on a role change
 * the engine puts the previous card back into the deck and binds the new one, and records
 * the status as a pure correction.
 */
function EditRoleModal({
  player,
  busy,
  onClose,
  onSave,
}: {
  player: LivePlayerState
  busy: boolean
  onClose: () => void
  onSave: (patch: PlayerCorrection) => void
}) {
  const t = useTranslations('liveTable')
  const catalog = useCatalog()
  const [pick, setPick] = useState(player.roleId ?? '')
  const [aliveChoice, setAliveChoice] = useState<'alive' | 'dead'>(player.alive ? 'alive' : 'dead')
  const [cause, setCause] = useState<DeathCause | ''>((player.deathCause ?? '') as DeathCause | '')

  // Escape closes the modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const role = pick ? getRole(pick) : undefined
  const wantAlive = aliveChoice === 'alive'
  const roleChanged = pick !== '' && pick !== player.roleId
  const statusChanged =
    wantAlive !== player.alive || (!wantAlive && (cause || '') !== (player.deathCause ?? ''))
  const canSave = roleChanged || statusChanged

  function save() {
    const patch: PlayerCorrection = {}
    if (roleChanged) patch.roleId = pick
    if (statusChanged) {
      patch.alive = wantAlive
      if (!wantAlive) patch.cause = (cause || 'other') as DeathCause
    }
    onSave(patch)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('edit.label')}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-border bg-background p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 truncate text-base font-semibold">
            {pick ? <RoleIcon roleId={pick} size={20} /> : <Icon name="person" size={20} className="opacity-40" />}
            <span className="truncate">{player.displayName}</span>
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('edit.close')}>
            ✕
          </Button>
        </div>

        <label className="mb-1 block text-sm font-medium">{t('edit.role')}</label>
        <Select value={pick} onChange={(e) => setPick(e.target.value)} autoFocus>
          <option value="">{t('edit.roleOpen')}</option>
          {CATEGORY_ORDER.map((cat) => (
            <optgroup key={cat} label={catalog.roleCategories[cat]}>
              {ROLE_CATALOG.filter((r) => r.category === cat).map((r) => (
                <option key={r.id} value={r.id}>
                  {roleName(catalog, r.id)}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>

        {role && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-border bg-muted/30 p-2.5 text-xs">
            <RoleIcon roleId={role.id} size={16} />
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 font-medium">
                {roleName(catalog, role.id)}
                <Badge variant={factionVariant(role.faction)} className="px-1.5 py-0 text-[10px]">
                  {catalog.factions[role.faction as Faction] ?? role.faction}
                </Badge>
              </span>
              <span className="text-muted-foreground">{roleText(catalog, role.id).description}</span>
            </div>
          </div>
        )}

        {/* Add or correct the alive/dead status */}
        <span className="mb-1 mt-4 block text-sm font-medium">{t('edit.status')}</span>
        <div className="flex gap-2">
          <Button
            variant={wantAlive ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
            onClick={() => setAliveChoice('alive')}
          >
            {t('edit.alive')}
          </Button>
          <Button
            variant={!wantAlive ? 'destructive' : 'outline'}
            size="sm"
            className="flex-1"
            onClick={() => setAliveChoice('dead')}
          >
            {t('edit.dead')}
          </Button>
        </div>
        {!wantAlive && (
          <div className="mt-2">
            <label className="mb-1 block text-xs text-muted-foreground">{t('edit.deathCause')}</label>
            <Select value={cause} onChange={(e) => setCause(e.target.value as DeathCause | '')}>
              <option value="">{t('edit.pickCause')}</option>
              {DEATH_CAUSES.map((c) => (
                <option key={c} value={c}>
                  {deathCauseLabel(catalog, c)}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <Button className="flex-1" disabled={busy || !canSave} onClick={save}>
            {t('edit.save')}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {t('edit.cancel')}
          </Button>
        </div>
      </div>
    </div>
  )
}
