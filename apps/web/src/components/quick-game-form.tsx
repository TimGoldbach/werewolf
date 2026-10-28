'use client'

import {
  DEATH_CAUSES,
  getRole,
  winConditionText,
  winConditionToFaction,
  WIN_CONDITION_LIST,
  type Player,
  type SetSuggestion,
  type WinCondition,
} from '@werewolf/shared'
import { Trophy } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { DeckBuilder } from '@/components/game-setup/deck-builder'
import { PlayerPicker } from '@/components/game-setup/player-picker'
import { RolePalette } from '@/components/game-setup/role-palette'
import { FactionStripe } from '@/components/game-setup/role-tiles'
import { RoleIcon } from '@/components/pixel/icons'
import { SetSuggestions } from '@/components/set-suggestions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { clientFetch, useErrorText } from '@/lib/client-api'
import type { GameFormPrefill, Row } from '@/lib/game-prefill'
import {
  EMPTY_SETUP_HINTS,
  useRoleLabel,
  VILLAGER_ROLE_ID,
  WEREWOLF_ROLE_ID,
  type SetupHints,
} from '@/lib/setup-hints'
import { useAppLocale, useCatalog } from '@/lib/texts'
import { cn } from '@/lib/utils'

const SOLO_ROLE_BY_CONDITION: Partial<Record<WinCondition, string>> = {
  'pied-piper': 'pied-piper',
  'white-werewolf': 'white-werewolf',
  angel: 'angel',
}

function todayIso(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function emptyRow(playerId: string): Row {
  return { playerId, roleId: '', isWinner: false, survived: '', diedRound: '', deathCause: '' }
}

export function QuickGameForm({
  players,
  initial,
  editGameId,
  setSuggestions,
  hints = EMPTY_SETUP_HINTS,
}: {
  players: Player[]
  initial?: GameFormPrefill
  /** set ⇒ edit mode: PUT to the existing game instead of a new POST */
  editGameId?: string
  /** sets already played (all player counts) — suggestions for the live deck */
  setSuggestions?: SetSuggestion[]
  /** shortcuts from the game history (regular players, recent line-ups, popular roles) */
  hints?: SetupHints
}) {
  const t = useTranslations('gameForm')
  const catalog = useCatalog()
  const locale = useAppLocale()
  const roleLabel = useRoleLabel()
  const errorText = useErrorText()
  const router = useRouter()
  const isEdit = Boolean(editGameId)
  // Editing always uses the quick style (result projection), never the live deck.
  const [mode, setMode] = useState<'quick' | 'live'>(isEdit ? 'quick' : (initial?.mode ?? 'quick'))
  // Extendable locally: anyone created in the form is selectable right away.
  const [knownPlayers, setKnownPlayers] = useState<Player[]>(players)
  const [rows, setRows] = useState<Row[]>(initial?.rows ?? [])
  // Live: the role deck (multiset) – independent of the people, assignment happens in the game.
  const [deck, setDeck] = useState<string[]>(initial?.deck ?? [])
  // Quick: the role a tap on a person assigns ("brush"). Wolves first is the
  // usual starting point when entering a game after the fact.
  const [brush, setBrush] = useState(WEREWOLF_ROLE_ID)
  const [moderatorId, setModeratorId] = useState(initial?.moderatorId ?? '')
  const [winningCondition, setWinningCondition] = useState<WinCondition | ''>(
    initial?.winningCondition ?? '',
  )
  const [playedAt, setPlayedAt] = useState(initial?.playedAt ?? todayIso())
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [showDetails, setShowDetails] = useState(initial?.showDetails ?? false)
  // House rule of the live game. Deliberately no "on" default: the rule changes
  // the game significantly, so it should be chosen rather than overlooked.
  const [revealRoles, setRevealRoles] = useState(initial?.revealRolesOnDeath ?? false)
  // Presentation, not a house rule: defaulting to "on" matches the previous behaviour.
  const [showNarration, setShowNarration] = useState(initial?.showNarration ?? true)
  const [soundEnabled, setSoundEnabled] = useState(initial?.soundEnabled ?? true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const usedPlayerIds = useMemo(() => new Set(rows.map((r) => r.playerId)), [rows])
  const nameById = useMemo(
    () => new Map(knownPlayers.map((p) => [p.id, p.displayName])),
    [knownPlayers],
  )
  const selectedIds = useMemo(() => rows.map((r) => r.playerId), [rows])

  // Alphabetical for assigning — easier to find "who was the seer?" than in click order.
  const sortedRows = useMemo(
    () =>
      rows
        .map((row, index) => ({ row, index }))
        .sort((a, b) =>
          (nameById.get(a.row.playerId) ?? '').localeCompare(nameById.get(b.row.playerId) ?? '', locale),
        ),
    [rows, nameById, locale],
  )
  const assignedCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of rows) if (r.roleId) counts.set(r.roleId, (counts.get(r.roleId) ?? 0) + 1)
    return counts
  }, [rows])
  const assigned = rows.filter((r) => r.roleId).length
  const unassigned = rows.length - assigned

  /** Applies the selection; existing rows (role, winner, death) are kept. */
  function setParticipants(ids: string[]) {
    setRows((prev) => {
      const byId = new Map(prev.map((r) => [r.playerId, r]))
      return ids.map((id) => byId.get(id) ?? emptyRow(id))
    })
  }

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  /** Brush tap: assign the role; tapping the same role again removes it. */
  function paint(index: number) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, roleId: r.roleId === brush ? '' : brush } : r)),
    )
  }

  function fillVillagers() {
    setRows((prev) => prev.map((r) => (r.roleId ? r : { ...r, roleId: VILLAGER_ROLE_ID })))
  }

  function applyWinners(condition: WinCondition) {
    const targetFaction = winConditionToFaction(condition)
    const soloRole = SOLO_ROLE_BY_CONDITION[condition]
    setRows((prev) =>
      prev.map((r) => {
        if (soloRole) return { ...r, isWinner: r.roleId === soloRole }
        if (targetFaction) {
          const faction = getRole(r.roleId)?.faction
          return { ...r, isWinner: faction === targetFaction }
        }
        return { ...r, isWinner: false }
      }),
    )
  }

  async function submit() {
    setError(null)
    if (rows.length < 3) return setError(t('errors.minPlayers'))

    setBusy(true)
    try {
      if (mode === 'live' && !isEdit) {
        if (deck.length !== rows.length) {
          setBusy(false)
          return setError(t('errors.deckSize', { needed: rows.length, current: deck.length }))
        }
        const created = await clientFetch<{ id: string }>('/games/live', {
          method: 'POST',
          body: JSON.stringify({
            playedAt: new Date(`${playedAt}T20:00:00`).toISOString(),
            moderatorId: moderatorId || null,
            notes: notes || undefined,
            players: rows.map((r) => ({ playerId: r.playerId })),
            roles: deck,
            revealRolesOnDeath: revealRoles,
            showNarration,
            soundEnabled,
          }),
        })
        router.push(`/games/live/${created.id}`)
        router.refresh()
        return
      }
      if (rows.some((r) => !r.roleId)) {
        setBusy(false)
        return setError(t('errors.missingRole'))
      }
      if (!winningCondition) {
        setBusy(false)
        return setError(t('errors.missingWinCondition'))
      }
      const body = JSON.stringify({
        playedAt: new Date(`${playedAt}T20:00:00`).toISOString(),
        moderatorId: moderatorId || null,
        winningCondition,
        notes: notes || undefined,
        players: rows.map((r) => ({
          playerId: r.playerId,
          roleId: r.roleId,
          isWinner: r.isWinner,
          survived: showDetails && r.survived ? r.survived === 'yes' : undefined,
          diedRound: showDetails && r.diedRound ? Number.parseInt(r.diedRound, 10) : undefined,
          deathCause: showDetails && r.deathCause ? r.deathCause : undefined,
        })),
      })
      if (isEdit) {
        await clientFetch(`/games/${editGameId}`, { method: 'PUT', body })
        router.push(`/games/${editGameId}`)
        router.refresh()
        return
      }
      // To the game page instead of the list: there the group is asked for set feedback after the game.
      const created = await clientFetch<{ id: string }>('/games/quick', { method: 'POST', body })
      router.push(`/games/${created.id}`)
      router.refresh()
    } catch (err) {
      setError(errorText(err, t('errors.saveFailed')))
      setBusy(false)
    }
  }

  const status =
    mode === 'live'
      ? t('status.live', { players: rows.length, deck: deck.length })
      : t('status.quick', { players: rows.length, assigned })
  const ready =
    rows.length >= 3 && (mode === 'live' ? deck.length === rows.length : unassigned === 0)

  return (
    <div className="flex flex-col gap-6">
      {!isEdit && (
        <div className="flex gap-2">
          <Button
            variant={mode === 'quick' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('quick')}
          >
            {t('mode.quick')}
          </Button>
          <Button
            variant={mode === 'live' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('live')}
          >
            {t('mode.live')}
          </Button>
        </div>
      )}
      <Card>
        <CardContent className="flex flex-col gap-4 pt-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('date')}</Label>
              <Input type="date" value={playedAt} onChange={(e) => setPlayedAt(e.target.value)} />
            </div>
            <div>
              <Label>{t('moderator')}</Label>
              <Select value={moderatorId} onChange={(e) => setModeratorId(e.target.value)}>
                <option value="">{t('noModerator')}</option>
                {knownPlayers
                  .filter((p) => !usedPlayerIds.has(p.id) && (p.active || p.id === moderatorId))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName}
                    </option>
                  ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <PlayerPicker
        players={knownPlayers}
        selectedIds={selectedIds}
        moderatorId={moderatorId}
        playerOrder={hints.playerOrder}
        recentLineups={isEdit ? [] : hints.recentLineups}
        onChange={setParticipants}
        onModeratorChange={setModeratorId}
        onPlayerCreated={(p) => {
          setKnownPlayers((prev) => [...prev, p])
          setRows((prev) => [...prev, emptyRow(p.id)])
        }}
      />

      {mode === 'quick' && rows.length > 0 && (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="font-semibold">
              {t('assign.heading')}{' '}
              <span className="text-muted-foreground">
                ({assigned}/{rows.length})
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">{t('assign.hint')}</p>
          </div>

          <RolePalette
            activeRoleId={brush}
            onActivate={setBrush}
            assignedCounts={assignedCounts}
            favoriteRoles={hints.favoriteRoles}
          />

          <div className="flex flex-col gap-1.5">
            {sortedRows.map(({ row, index }) => (
              <div key={row.playerId} className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="flex items-stretch">
                  {row.roleId ? <FactionStripe roleId={row.roleId} /> : <span aria-hidden className="w-1 shrink-0" />}
                  <button
                    type="button"
                    onClick={() => paint(index)}
                    aria-label={t(row.roleId === brush ? 'assign.remove' : 'assign.add', {
                      player: nameById.get(row.playerId) ?? '',
                      role: roleLabel(brush),
                    })}
                    className="flex min-h-12 min-w-0 flex-1 items-center gap-3 px-3 text-left active:bg-accent/60"
                  >
                    <span className="w-24 shrink-0 truncate font-medium">{nameById.get(row.playerId)}</span>
                    {row.roleId ? (
                      <span className="flex min-w-0 items-center gap-1.5 text-sm">
                        <RoleIcon roleId={row.roleId} size={18} className="shrink-0" />
                        <span className="truncate">{roleLabel(row.roleId)}</span>
                      </span>
                    ) : (
                      <span className="truncate rounded-full border border-dashed border-input px-2 py-0.5 text-sm text-muted-foreground">
                        + {roleLabel(brush)}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    aria-pressed={row.isWinner}
                    onClick={() => updateRow(index, { isWinner: !row.isWinner })}
                    className={cn(
                      'my-1.5 mr-1.5 inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors',
                      row.isWinner
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <Trophy className="h-3.5 w-3.5" aria-hidden />
                    {t('winner')}
                  </button>
                </div>
                {showDetails && (
                  <div className="grid grid-cols-3 gap-2 px-3 pb-3">
                    <Select
                      value={row.survived}
                      onChange={(e) => updateRow(index, { survived: e.target.value as Row['survived'] })}
                    >
                      <option value="">{t('details.survivedAsk')}</option>
                      <option value="yes">{t('details.survived')}</option>
                      <option value="no">{t('details.died')}</option>
                    </Select>
                    <Input
                      type="number"
                      min={0}
                      placeholder={t('details.diedRound')}
                      value={row.diedRound}
                      onChange={(e) => updateRow(index, { diedRound: e.target.value })}
                    />
                    <Select
                      value={row.deathCause}
                      onChange={(e) => updateRow(index, { deathCause: e.target.value as Row['deathCause'] })}
                    >
                      <option value="">{t('details.cause')}</option>
                      {DEATH_CAUSES.map((c) => (
                        <option key={c} value={c}>
                          {catalog.deathCauses[c]}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {unassigned > 0 ? (
              <Button type="button" variant="secondary" size="sm" onClick={fillVillagers}>
                {t('assign.fillVillagers', { count: unassigned })}
              </Button>
            ) : (
              <span />
            )}
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={showDetails}
                onChange={(e) => setShowDetails(e.target.checked)}
              />
              {t('assign.trackDeaths')}
            </label>
          </div>
        </section>
      )}

      {mode === 'live' && (
        <DeckBuilder
          deck={deck}
          onChange={setDeck}
          playerCount={rows.length}
          favoriteRoles={hints.favoriteRoles}
        >
          {setSuggestions && (
            <SetSuggestions
              suggestions={setSuggestions}
              playerCount={rows.length}
              deck={deck}
              onApply={setDeck}
            />
          )}
        </DeckBuilder>
      )}

      {mode === 'live' && (
        <Card>
          <CardContent className="pt-5">
            <h2 className="mb-2 font-semibold">{t('houseRule.title')}</h2>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={revealRoles}
                onChange={(e) => setRevealRoles(e.target.checked)}
              />
              <span className="text-sm">
                <span className="font-medium text-foreground">{t('houseRule.revealLabel')}</span>
                <span className="mt-0.5 block text-muted-foreground">{t('houseRule.revealHint')}</span>
              </span>
            </label>
          </CardContent>
        </Card>
      )}

      {mode === 'live' && (
        <Card>
          <CardContent className="pt-5">
            <h2 className="mb-2 font-semibold">{t('display.title')}</h2>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={showNarration}
                onChange={(e) => setShowNarration(e.target.checked)}
              />
              <span className="text-sm">
                <span className="font-medium text-foreground">{t('display.narrationLabel')}</span>
                <span className="mt-0.5 block text-muted-foreground">{t('display.narrationHint')}</span>
              </span>
            </label>
            <label className="mt-3 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
              />
              <span className="text-sm">
                <span className="font-medium text-foreground">{t('display.soundLabel')}</span>
                <span className="mt-0.5 block text-muted-foreground">{t('display.soundHint')}</span>
              </span>
            </label>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-col gap-3 pt-5">
          {mode === 'quick' && (
            <>
              <div>
                <Label>{t('outcome.winCondition')}</Label>
                <Select
                  value={winningCondition}
                  onChange={(e) => {
                    const wc = e.target.value as WinCondition | ''
                    setWinningCondition(wc)
                    // No winner marked yet → suggest one right away by faction.
                    if (wc && rows.every((r) => !r.isWinner)) applyWinners(wc)
                  }}
                >
                  <option value="">{t('outcome.choose')}</option>
                  {WIN_CONDITION_LIST.map((wc) => (
                    <option key={wc.id} value={wc.id}>
                      {winConditionText(catalog, wc.id).label}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => winningCondition && applyWinners(winningCondition)}
                disabled={!winningCondition}
              >
                {t('outcome.autoWinners')}
              </Button>
            </>
          )}
          <div>
            <Label>{t('outcome.notes')}</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('outcome.notesPlaceholder')} />
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-border bg-background/95 px-4 pb-4 pt-3 backdrop-blur">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'min-w-0 flex-1 text-sm tabular-nums',
              ready ? 'text-emerald-400' : 'text-muted-foreground',
            )}
          >
            {status}
          </span>
          <Button onClick={submit} disabled={busy} size="lg" className="shrink-0 px-6">
            {busy
              ? t('submit.busy')
              : isEdit
                ? t('submit.edit')
                : mode === 'live'
                  ? t('submit.live')
                  : t('submit.quick')}
          </Button>
        </div>
      </div>
    </div>
  )
}
