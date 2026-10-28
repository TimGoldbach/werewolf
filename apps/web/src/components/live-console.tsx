'use client'

import {
  buildDaySteps,
  buildNightSteps,
  buildSetupSteps,
  deathCauseLabel,
  isRoleAssignmentPending,
  isStepActionOpen,
  isStepBluffedByDog,
  isStepPart2Visible,
  primaryActionTarget,
  roleName,
  werewolfVictimId,
  whoreInWolfDenId,
  winConditionText,
  type EngineState,
  type Locale,
  type ModeratorStep,
  type StepTexts,
  type WinCondition,
} from '@werewolf/shared'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Icon, RoleIcon } from '@/components/pixel/icons'
import { LiveTable } from '@/components/live-table'
import { clientFetch, ClientApiError, useErrorText } from '@/lib/client-api'
import { useAppLocale, useCatalog, useStepTexts } from '@/lib/texts'
import type { LivePlayerState, LiveState } from '@/lib/types'
import { useAmbience } from '@/lib/use-ambience'
import { cn } from '@/lib/utils'

/** Banner icon per win condition; title and line are `liveConsole.winBanner.<condition>`. */
const WIN_ICONS: Record<WinCondition, string> = {
  werewolves: 'wolf-big',
  village: 'sun',
  'pied-piper': 'flute',
  'white-werewolf': 'wolf-white',
  lovers: 'heart',
  angel: 'angel',
  gull: 'gull',
  vampire: 'bat',
  'serial-killer': 'dagger-blood',
  demon: 'demon',
  'stone-golem': 'rock',
  werehamster: 'hamster',
  frida: 'bone',
  jason: 'noose',
  bella: 'heart-bella',
  hermione: 'book-magic',
  rascal: 'dice',
  groom: 'ring',
  blob: 'slime-blob',
  leech: 'drop',
  none: 'skull',
}

/** Win condition whose banner is shown; unknown values fall back to `none`. */
function bannerCondition(condition: string): WinCondition {
  return condition in WIN_ICONS ? (condition as WinCondition) : 'none'
}

function buildSteps(s: LiveState, texts: StepTexts): ModeratorStep[] {
  const es = s as unknown as EngineState
  if (s.phase === 'setup') return buildSetupSteps(es, texts)
  if (s.phase === 'night') return buildNightSteps(es, s.round <= 1, texts)
  if (s.phase === 'day') return buildDaySteps(es, texts)
  return []
}

/**
 * Entry step of a script. If the night is already resolved (reload at dawn, undo of the
 * start of the day, another device resolved it), only the closing step remains — the
 * earlier night steps have nothing left to do and would show secret night info
 * (lovers, checks …) while the village is awake.
 */
function entryCursor(s: LiveState, steps: ModeratorStep[]): number {
  if (s.phase !== 'night' || !s.nightResolved) return 0
  return Math.max(0, steps.findIndex((st) => st.control.kind === 'resolve'))
}

export function LiveConsole({ initial }: { initial: LiveState }) {
  const router = useRouter()
  const t = useTranslations('liveConsole')
  const errorText = useErrorText()
  const catalog = useCatalog()
  const locale = useAppLocale()
  const stepTexts = useStepTexts()
  const [state, setState] = useState<LiveState>(initial)
  const [steps, setSteps] = useState<ModeratorStep[]>(() => buildSteps(initial, stepTexts))
  const [cursor, setCursor] = useState(() => entryCursor(initial, steps))
  const [busy, setBusy] = useState(false)
  const [soundBusy, setSoundBusy] = useState(false)
  useAmbience(state.phase === 'day' ? 'day' : state.phase === 'night' ? 'night' : null, state.soundEnabled)
  // Steps in which the moderator has already acted in this session. Needed for actions
  // that cannot be narrowed down to "done tonight" from the state alone (charming,
  // infecting, gull hits, seer check) — see actedLocally.
  const [actedSteps, setActedSteps] = useState<ReadonlySet<string>>(() => new Set())
  // Dismissed win modal: remembered per win condition so the 2-second poll does not
  // immediately pop it up again, while a CHANGE of the condition is noticed again.
  const [dismissedWin, setDismissedWin] = useState<string | null>(null)
  // Spoiler protection by day: step (phaseKey:cursor) in which the moderator revealed.
  const [revealedFor, setRevealedFor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Input helper fields
  const [target, setTarget] = useState('')
  const [loverA, setLoverA] = useState('')
  const [loverB, setLoverB] = useState('')
  const [revealId, setRevealId] = useState('')

  const phaseKey = `${state.phase}:${state.round}`
  const lastKey = useRef(phaseKey)

  // Live sync: all devices share the same server-side event log. We poll a lightweight
  // version signal; when it changes (another device did something), we fetch the full
  // state — so every device is "in the same moment".
  //
  // versionRef/busyRef are deliberately maintained SYNCHRONOUSLY in send()/undo() (not via an
  // effect after render): that way a concurrent poll immediately sees the progress of a local
  // action that was just committed and cannot overwrite it with an older server response (lost update).
  const versionRef = useRef(initial.version)
  const busyRef = useRef(false)
  const connectedRef = useRef(true)
  const [connected, setConnected] = useState(true)
  useEffect(() => {
    if (state.phase === 'finished') return
    let cancelled = false
    const markConnected = (ok: boolean) => {
      if (connectedRef.current !== ok) {
        connectedRef.current = ok
        setConnected(ok)
      }
    }
    const tick = async () => {
      if (busyRef.current || (typeof document !== 'undefined' && document.hidden)) return
      try {
        const v = await clientFetch<{ version: string; status: string }>(`/games/${state.id}/version`)
        markConnected(true)
        if (cancelled || busyRef.current || v.version === versionRef.current) return
        const expected = versionRef.current
        const next = await clientFetch<LiveState>(`/games/${state.id}/state`)
        // Discard if a local action committed in the meantime (versionRef moved) or a newer
        // poll has already been applied — otherwise the older response would roll the state back.
        if (cancelled || busyRef.current || versionRef.current !== expected) return
        versionRef.current = next.version
        setState(next)
      } catch {
        markConnected(false) // connection/session gone → badge shows "Verbindung verloren"
      }
    }
    const onVisible = () => {
      if (typeof document !== 'undefined' && !document.hidden) void tick()
    }
    const interval = setInterval(tick, 2000)
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      clearInterval(interval)
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible)
    }
  }, [state.id, state.phase])

  // Re-establish the script on a phase change and reset the cursor.
  useEffect(() => {
    if (lastKey.current !== phaseKey) {
      lastKey.current = phaseKey
      const next = buildSteps(state, stepTexts)
      setSteps(next)
      setCursor(entryCursor(state, next))
      setActedSteps(new Set())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseKey])

  // Language switch (a router refresh keeps this component's state): rebuild the script in
  // the new language. Only the texts change, so the cursor stays on the same step.
  const lastLocale = useRef(locale)
  useEffect(() => {
    if (lastLocale.current !== locale) {
      lastLocale.current = locale
      setSteps(buildSteps(state, stepTexts))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale])

  // If another device resolved the night, this one also jumps to the closing step
  // (see entryCursor). Whoever resolves it themselves is already there.
  useEffect(() => {
    if (state.phase === 'night' && state.nightResolved) setCursor(entryCursor(state, steps))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.nightResolved])

  // Clear the input fields on a step change.
  useEffect(() => {
    setTarget('')
    setLoverA('')
    setLoverB('')
    setRevealId('')
    setError(null)
  }, [cursor])

  // Live-sync guard: if a poll (another device) removes the currently selected player from the
  // living, the selection must lapse — otherwise the corresponding action button would stay
  // active with a stale, invalid target id (it only checks "set", not "still alive").
  useEffect(() => {
    const aliveIds = new Set(state.players.filter((p) => p.alive).map((p) => p.playerId))
    setTarget((t) => (t && !aliveIds.has(t) ? '' : t))
    setRevealId((r) => (r && !aliveIds.has(r) ? '' : r))
    setLoverA((a) => (a && !aliveIds.has(a) ? '' : a))
    setLoverB((b) => (b && !aliveIds.has(b) ? '' : b))
  }, [state.players])

  const living = state.players.filter((p) => p.alive)
  const step = steps[cursor]
  // The script helpers from @werewolf/shared operate on the EngineState; LiveState is
  // its projection plus display names (same pattern as in buildSteps).
  const engineState = state as unknown as EngineState
  const atEnd = cursor >= steps.length - 1

  // Spoiler protection: from dawn (night resolved) until the next night the village is
  // awake — fellow players can then look at the screen. Roles and secret night info stay
  // concealed during that time and appear only on request. Revealing only applies to the
  // current step: every step or phase change conceals again so nothing is accidentally left
  // open. Derived via the key instead of being reset by an effect — so nothing flashes up
  // for a frame when advancing.
  const villageAwake = state.phase === 'day' || (state.phase === 'night' && state.nightResolved)
  const revealKey = `${phaseKey}:${cursor}`
  const concealed = villageAwake && revealedFor !== revealKey
  const reveal = () => setRevealedFor(revealKey)

  // If the proposal disappears again (undo, correction), the modal may pop up again next
  // time — otherwise it would stay silent for the rest of the game.
  const proposedCondition = state.proposedWinner?.condition ?? null
  useEffect(() => {
    if (proposedCondition === null) setDismissedWin(null)
  }, [proposedCondition])
  const showWinModal =
    proposedCondition !== null && dismissedWin !== proposedCondition && !state.pendingHunterId

  // Role assignment on waking: as long as copies of the step's role are still unassigned in
  // the deck, the moderator must first determine the person(s).
  const stepRole = step?.roleId ?? null
  const unassignedOfStep = stepRole
    ? state.unassignedRoles.filter((r) => r === stepRole).length
    : 0
  const assignPending = step ? isRoleAssignmentPending(step, engineState) : false
  const unclaimedAlive = living.filter((p) => !p.roleId)
  const stepHolders = stepRole ? state.players.filter((p) => p.roleId === stepRole) : []

  // Dog block: if the blocked person (state.blockedId) is the only living holder of this
  // step's role, the step is only called for show (alibi, no real action).
  const blockedStep = step ? isStepBluffedByDog(step, engineState) : false

  // UX: steer "what needs to be done?" purely visually.
  // - actionOpen: the step has an input that is still pending → highlight the card.
  //   Once it is done, the card calms down again.
  // - primaryInCard: the highlighted (purple) button sits exactly where things continue —
  //   in the card while a mandatory step is still open, otherwise at the bottom on "Weiter".
  //   That way there is exactly ONE highlighted button at any time. Optional steps
  //   (witch, mayor, vote …) can be skipped at any time → there "Weiter" is the main
  //   action from the start.
  // - selfAdvancing: the step advances via its own button → do not offer "Weiter", so the
  //   action (e.g. resolving the night) is not skipped by accident. Currently never applies
  //   in addition to `atEnd`, because each of these steps is the last of its phase (a test in
  //   script.test.ts pins this guarantee) — it stays as a safeguard in case a step is ever
  //   sorted in after it.
  // Local acknowledgement for actions that leave no trace in the state: the seer check
  // triggers no event (just a selection), and charming/infecting/gull hits accumulate over
  // the whole game — so the console remembers where it acted in this session.
  const actedLocally = step
    ? actedSteps.has(step.id) || (step.control.kind === 'reveal' && revealId !== '')
    : false
  const actionOpen = step ? isStepActionOpen(step, engineState, actedLocally) : false
  const primaryInCard = step
    ? primaryActionTarget(step, engineState, actedLocally) === 'card'
    : false
  const selfAdvancing = step
    ? ['resolve', 'startNight', 'openingDay'].includes(step.control.kind)
    : false

  // Another device has finished the game (409): not a real error — fetch the current state
  // (which then shows the result) instead of a misleading error message.
  async function handleActionError(err: unknown, fallback: string) {
    if (err instanceof ClientApiError && err.status === 409) {
      try {
        const next = await clientFetch<LiveState>(`/games/${state.id}/state`)
        versionRef.current = next.version
        setState(next)
        return
      } catch {
        /* falls back to the error message */
      }
    }
    setError(errorText(err, fallback))
  }

  /** Appends an event. Returns `false` if it failed. */
  async function send(type: string, payload?: Record<string, unknown>, advance = false) {
    busyRef.current = true
    setBusy(true)
    setError(null)
    try {
      const next = await clientFetch<LiveState>(`/games/${state.id}/events`, {
        method: 'POST',
        body: JSON.stringify({ type, payload: payload ?? {} }),
      })
      versionRef.current = next.version
      setState(next)
      if (advance) setCursor((c) => Math.min(c + 1, steps.length - 1))
      return true
    } catch (err) {
      await handleActionError(err, t('errors.action'))
      return false
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  // Seer check: it triggers no event, so the acknowledgement hangs on the selection.
  // That selection may lapse, though — the effect further up clears `revealId` as soon as the
  // checked person dies (poll from a second device, death correction). That is why the step
  // is additionally ticked off for good when checking, otherwise it would count as open again later.
  function markRevealed(playerId: string) {
    setRevealId(playerId)
    const id = step?.id
    if (playerId && id) setActedSteps((prev) => new Set(prev).add(id))
  }

  // Action from the step card: like send(), but also marks the step as done. Deliberately
  // NOT in send() itself — corrections from the overview (role, death) or the hunter's shot
  // should not make the current step count as ticked off.
  async function act(type: string, payload?: Record<string, unknown>, advance = false) {
    const id = step?.id
    // Only tick off after a successful append — otherwise "Weiter" would wrongly be
    // highlighted as the next step after a failed attempt.
    if ((await send(type, payload, advance)) && id) {
      setActedSteps((prev) => new Set(prev).add(id))
    }
  }

  // "Neue Geschichte": draw a different narration variant. `which` selects the block —
  // merged steps carry two narrations that can be rerolled separately.
  function rerollStory(which: 'lore' | 'part2' = 'lore') {
    const pick = (variants: readonly string[] | undefined, current: string) => {
      if (!variants || variants.length < 2) return null
      const others = variants.filter((v) => v !== current)
      return others[Math.floor(Math.random() * others.length)] ?? current
    }
    setSteps((prev) =>
      prev.map((s, i) => {
        if (i !== cursor) return s
        if (which === 'lore') {
          const next = pick(s.loreVariants, s.lore)
          return next ? { ...s, lore: next } : s
        }
        if (!s.part2) return s
        const next = pick(s.part2.loreVariants, s.part2.lore)
        return next ? { ...s, part2: { ...s.part2, lore: next } } : s
      }),
    )
  }

  /**
   * Switches the soundscape for the whole game. Optimistic, so the sound reacts right away;
   * other devices pick the change up through the version signal.
   */
  async function toggleSound() {
    const soundEnabled = !state.soundEnabled
    busyRef.current = true
    setSoundBusy(true)
    setState((s) => ({ ...s, soundEnabled }))
    try {
      const next = await clientFetch<LiveState>(`/games/${state.id}/settings`, {
        method: 'PATCH',
        body: JSON.stringify({ soundEnabled }),
      })
      versionRef.current = next.version
      setState(next)
    } catch (err) {
      setState((s) => ({ ...s, soundEnabled: !soundEnabled }))
      await handleActionError(err, t('errors.sound'))
    } finally {
      busyRef.current = false
      setSoundBusy(false)
    }
  }

  async function undo() {
    // The step counts as open again afterwards — otherwise "Weiter" would stay highlighted
    // even though the input was taken back.
    const id = step?.id
    if (id) {
      setActedSteps((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
    busyRef.current = true
    setBusy(true)
    setError(null)
    try {
      const next = await clientFetch<LiveState>(`/games/${state.id}/undo`, { method: 'POST' })
      versionRef.current = next.version
      setState(next)
    } catch (err) {
      await handleActionError(err, t('errors.undo'))
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  /** Finishes the game and scores it. From the win modal without a confirmation prompt —
   *  the modal is already the deliberate confirmation. */
  async function finish(confirmed = false) {
    if (!confirmed && !window.confirm(t('finishConfirm'))) return
    busyRef.current = true
    setBusy(true)
    setError(null)
    try {
      await clientFetch(`/games/${state.id}/finish`, { method: 'POST', body: '{}' })
      router.push(`/games/${state.id}`)
      router.refresh()
    } catch (err) {
      // If another device has already finished (409), the game is scored → go to the results.
      if (err instanceof ClientApiError && err.status === 409) {
        router.push(`/games/${state.id}`)
        router.refresh()
        return
      }
      setError(errorText(err, t('errors.finish')))
      busyRef.current = false
      setBusy(false)
    }
  }

  if (state.phase === 'finished') {
    const wc = bannerCondition(state.proposedWinner?.condition ?? 'none')
    const winners = (state.proposedWinner?.winnerIds ?? [])
      .map((id) => state.players.find((p) => p.playerId === id))
      .filter((p): p is LivePlayerState => Boolean(p))
    return (
      <Card className="border-primary">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex items-center gap-2">
            <Icon name="sparkle" size={16} />
            <Icon name={WIN_ICONS[wc]} size={56} />
            <Icon name="sparkle" size={16} />
          </div>
          <p className="font-pixel text-sm">{t(`winBanner.${wc}.title`)}</p>
          <p className="max-w-xs text-sm text-muted-foreground">{t(`winBanner.${wc}.line`)}</p>
          {winners.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {winners.map((p) => (
                <span key={p.playerId} className="flex items-center gap-1 text-sm">
                  {p.roleId && <RoleIcon roleId={p.roleId} size={18} />}
                  {p.displayName}
                </span>
              ))}
            </div>
          )}
          <Button className="mt-2" onClick={() => router.push(`/games/${state.id}`)}>
            {t('toResults')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-lg px-1 pb-24 pt-1 transition-colors',
        state.phase === 'night' && 'bg-gradient-to-b from-indigo-950/40 to-transparent',
        state.phase === 'day' && 'bg-gradient-to-b from-amber-900/20 to-transparent',
      )}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2 font-semibold">
            <Icon name={state.phase === 'night' ? 'moon' : state.phase === 'day' ? 'sun' : 'star'} size={18} />
            {t(state.phase === 'night' ? 'phase.night' : state.phase === 'day' ? 'phase.day' : 'phase.setup')}
            {state.round > 0 && ` · ${t('round', { round: state.round })}`}
            {/* House rule of this game — visible even when nobody is dead (yet). */}
            {state.revealRolesOnDeath && (
              <span
                className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-300"
                title={t('revealRolesRule.title')}
              >
                🃏 {t('revealRolesRule.label')}
              </span>
            )}
          </span>
          <div className="flex items-center gap-2">
            {/* Live-sync indicator: fed by the poll result, not decorative. On a lost
                connection it honestly says "Verbindung verloren" instead of staying green. */}
            {connected ? (
              <span
                className="flex items-center gap-1 text-xs text-emerald-400"
                title={t('connection.liveTitle')}
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden />
                {t('connection.live')}
              </span>
            ) : (
              <span
                className="flex items-center gap-1 text-xs text-amber-400"
                title={t('connection.lostTitle')}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
                {t('connection.lost')}
              </span>
            )}
            {/* Day/night soundscape for the whole game, switchable in every phase. */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn('w-9 px-0', state.soundEnabled ? 'text-foreground' : 'text-muted-foreground')}
              onClick={toggleSound}
              disabled={busy || soundBusy}
              aria-pressed={state.soundEnabled}
              aria-label={state.soundEnabled ? t('sound.turnOff') : t('sound.turnOn')}
              title={state.soundEnabled ? t('sound.on') : t('sound.off')}
            >
              {state.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            {/* Discussion timer — day only, started manually */}
            {state.phase === 'day' && <DayTimer />}
            <span className="text-xs tabular-nums text-muted-foreground">
              {Math.min(cursor + 1, steps.length)} / {steps.length}
            </span>
          </div>
        </div>
        {/* Visual progress: done · current · upcoming */}
        <div className="flex items-center gap-1" aria-hidden>
          {steps.map((s, i) => (
            <span
              key={s.id}
              title={s.title}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                i < cursor ? 'bg-primary/40' : i === cursor ? 'bg-primary' : 'bg-muted',
              )}
            />
          ))}
        </div>
      </div>

      {/* Possible end of the game: as a modal so it does not get lost while clicking through.
          The hunter's shot is awaited — it can still flip the outcome. */}
      {showWinModal && state.proposedWinner && (
        <WinProposalModal
          condition={state.proposedWinner.condition}
          winners={state.proposedWinner.winnerIds
            .map((id) => state.players.find((p) => p.playerId === id))
            .filter((p): p is LivePlayerState => Boolean(p))}
          busy={busy}
          onFinish={() => finish(true)}
          onDismiss={() => setDismissedWin(state.proposedWinner!.condition)}
        />
      )}

      {/* Win proposal — stays as a quiet reminder even after the modal has been
          dismissed. */}
      {state.proposedWinner && (
        <Card className="border-primary bg-primary/10 ring-2 ring-primary/40">
          <CardContent className="flex items-center justify-between gap-3 py-3">
            <span className="flex items-center gap-2">
              <Icon name="sparkle" size={18} />
              <span>
                {t.rich('possibleEnd', {
                  label: winConditionText(catalog, state.proposedWinner.condition).label,
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </span>
            </span>
            <Button size="sm" onClick={() => finish()} disabled={busy} className="shrink-0">
              {t('finishNow')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* House rule "reveal roles after death": reminder of the dead of the current
          round. Deliberately ONE place at the top level instead of per step — deaths arise in
          three places (night resolution, lynching, hunter's shot), and the state does not
          reliably tell which death came from the night and which from the day: a
          hunter's shot can be either. This list is always correct and disappears on its
          own as soon as the next round begins. */}
      {state.revealRolesOnDeath && (
        <RevealReminder
          dead={state.players
            .filter((p) => !p.alive && p.diedRound === state.round)
            .sort((a, b) => a.displayName.localeCompare(b.displayName))}
        />
      )}

      {/* Hunter must shoot */}
      {state.pendingHunterId && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-base text-destructive">
              🔫{' '}
              {t('hunter.title', {
                name: state.players.find((p) => p.playerId === state.pendingHunterId)?.displayName ?? '',
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <PlayerSelect players={living} value={target} onChange={setTarget} showRoles={!concealed} />
            <Button
              variant="destructive"
              disabled={busy || !target}
              onClick={() => send('HunterShot', { targetId: target })}
            >
              {t('hunter.shoot')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Rusty sword knight devoured → moderator names the infected wolf.
          Usually already falls at dawn; when concealed, only a neutral hint is shown. */}
      {state.pendingRustyKnightId &&
        (concealed ? (
          <SecretTaskHint onReveal={reveal} />
        ) : (
          <RustyDesignateCard
            knightName={
              state.players.find((p) => p.playerId === state.pendingRustyKnightId)?.displayName ?? '—'
            }
            wolves={living.filter((p) => p.faction === 'werewolves')}
            busy={busy}
            onDesignate={(playerId) => send('RustyInfect', { targetId: playerId })}
          />
        ))}

      {/* Reminder: the infected wolf dies from the rusty blade (following night) — names
          a werewolf, so during the day only when revealed. */}
      {!concealed && !state.pendingRustyKnightId && state.rustyInfectedId && (
        <RustyReminder
          wolfName={
            state.players.find((p) => p.playerId === state.rustyInfectedId)?.displayName ?? '—'
          }
          diesThisNight={
            state.phase === 'night' &&
            state.rustyInfectedRound !== null &&
            state.round - state.rustyInfectedRound >= 2
          }
        />
      )}

      {/* Current step — the border highlights when an action is needed */}
      {step && (
        <Card className={cn(actionOpen && 'ring-1 ring-primary/40')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {step.roleId && <RoleIcon roleId={step.roleId} size={22} />}
              {step.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {/* To be read aloud — visually clearly set apart from the instruction so that
                during play you can see at a glance what is text and what is a task. Can be
                switched off entirely via a setting when creating the game. */}
            {state.showNarration && (
              <Narration
                lore={step.lore}
                canReroll={Boolean(step.loreVariants && step.loreVariants.length > 1)}
                onReroll={() => rerollStory('lore')}
              />
            )}
            <p className="text-sm">{step.instruction}</p>

            {/* Second block of merged steps: "now" immediately, "done" only once
                the first part is finished. */}
            {isStepPart2Visible(step, engineState) && step.part2 && (
              <>
                {state.showNarration && (
                  <Narration
                    lore={step.part2.lore}
                    canReroll={Boolean(step.part2.loreVariants && step.part2.loreVariants.length > 1)}
                    onReroll={() => rerollStory('part2')}
                  />
                )}
                {step.part2.instruction && <p className="text-sm">{step.part2.instruction}</p>}
              </>
            )}

            {assignPending && stepRole ? (
              <AssignGate
                roleId={stepRole}
                remaining={unassignedOfStep}
                candidates={unclaimedAlive}
                holders={stepHolders}
                busy={busy}
                onAssign={(playerId) => send('RoleAssigned', { playerId, roleId: stepRole })}
              />
            ) : blockedStep ? (
              <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                <span aria-hidden>🚫</span>
                <span>{t('dogBlocked')}</span>
              </div>
            ) : (
              <div className={cn(actionOpen && 'rounded-md bg-primary/5 p-2.5 ring-1 ring-primary/25')}>
                <StepControl
                  step={step}
                  state={state}
                  living={living}
                  busy={busy}
                  primary={primaryInCard}
                  target={target}
                  setTarget={setTarget}
                  loverA={loverA}
                  setLoverA={setLoverA}
                  loverB={loverB}
                  setLoverB={setLoverB}
                  revealId={revealId}
                  setRevealId={markRevealed}
                  send={act}
                  concealed={concealed}
                  onReveal={reveal}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Spoiler protection: while the village is awake, only a toggle stands here instead of the
          overview — roles & co. only on request, afterwards clearly marked as "aufgedeckt". */}
      {villageAwake && (
        <SpoilerToggle
          concealed={concealed}
          aliveCount={living.length}
          total={state.players.length}
          onToggle={concealed ? reveal : () => setRevealedFor(null)}
        />
      )}

      {/* Moderator overview: all players with role, side, status, alive/dead.
          Long-pressing a player opens the role and status correction. */}
      {!concealed && (
        <LiveTable
          state={state}
          busy={busy}
          onCorrect={async (playerId, patch) => {
            if (patch.roleId !== undefined) {
              await send('RoleAssigned', { playerId, roleId: patch.roleId })
            }
            if (patch.alive !== undefined) {
              await send('DeathSet', { playerId, alive: patch.alive, cause: patch.cause })
            }
          }}
        />
      )}

      {/* Escape hatch for roles that do not wake up (hunter, elder, rusty sword knight) — in every phase,
          but by day only when revealed: the open cards give away who can still be in the game. */}
      {!concealed && (
        <ManualAssignPanel
          players={unclaimedAlive}
          unassignedRoles={state.unassignedRoles}
          busy={busy}
          onAssign={(playerId, roleId) => send('RoleAssigned', { playerId, roleId })}
        />
      )}

      <Button variant="ghost" size="sm" className="self-center text-muted-foreground" onClick={() => finish()} disabled={busy}>
        {t('finishManually')}
      </Button>

      {/* Sticky action bar: undo, status & primary action always within thumb reach. */}
      <div data-live-action-bar className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={busy}
            className="shrink-0 text-muted-foreground"
          >
            ↶ {t('undo')}
          </Button>
          <span aria-live="polite" className="min-w-0 flex-1 truncate text-center text-xs">
            {error ? (
              <span className="font-medium text-destructive">{error}</span>
            ) : busy ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('sending')}
              </span>
            ) : null}
          </span>
          {state.proposedWinner ? (
            <Button size="sm" onClick={() => finish()} disabled={busy} className="shrink-0">
              {t('finish')}
            </Button>
          ) : !atEnd && !selfAdvancing ? (
            // While a mandatory step is open, "Weiter" steps back to an outline (the
            // action in the card is primary). Once it is done — or the step is optional
            // or read-aloud only — "Weiter" is the clear main action.
            <Button
              size="sm"
              variant={primaryInCard ? 'outline' : 'default'}
              onClick={() => setCursor((c) => Math.min(c + 1, steps.length - 1))}
              disabled={busy}
              className="shrink-0"
            >
              {t('next')} →
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/**
 * Possible end of the game — as a modal instead of an easily overlooked card. It appears
 * once per win condition; "Weiterspielen" closes it until the proposal changes
 * (see dismissedWin in the console). Structure deliberately identical to the other dialogs
 * of this view (day timer, role correction): z-50 sits above the sticky bar (z-20).
 */
function WinProposalModal({
  condition,
  winners,
  busy,
  onFinish,
  onDismiss,
}: {
  condition: WinCondition
  winners: LivePlayerState[]
  busy: boolean
  onFinish: () => void
  onDismiss: () => void
}) {
  const t = useTranslations('liveConsole')
  const catalog = useCatalog()
  // Escape closes the modal (as with the day timer and role correction).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDismiss])

  const wc = bannerCondition(condition)
  const label = winConditionText(catalog, condition).label

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('winModal.title')}
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-primary bg-background p-5 text-center shadow-xl ring-2 ring-primary/40"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('winModal.title')}
        </p>

        <div className="mt-3 flex items-center justify-center gap-2">
          <Icon name="sparkle" size={16} />
          <Icon name={WIN_ICONS[wc]} size={56} />
          <Icon name="sparkle" size={16} />
        </div>

        <p className="mt-3 font-pixel text-sm">{t(`winBanner.${wc}.title`)}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t(`winBanner.${wc}.line`)}</p>

        <p className="mt-3 text-sm">
          {t.rich('winModal.condition', { label, strong: (chunks) => <strong>{chunks}</strong> })}
        </p>

        {winners.length > 0 && (
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {winners.map((p) => (
              <span
                key={p.playerId}
                className="flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-sm"
              >
                {p.roleId && <RoleIcon roleId={p.roleId} size={16} />}
                {p.displayName}
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <Button className="flex-1" onClick={onFinish} disabled={busy} autoFocus>
            {t('finishNow')}
          </Button>
          <Button variant="outline" onClick={onDismiss} disabled={busy}>
            {t('winModal.keepPlaying')}
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{t('winModal.hint')}</p>
      </div>
    </div>
  )
}

/**
 * Narration text to read aloud. Deliberately its own, set-apart block: during play it must
 * be clear at a glance what you read out to the group and what your own task is —
 * italic running text right next to the instruction blurs exactly that.
 */
function Narration({
  lore,
  canReroll,
  onReroll,
}: {
  lore: string
  canReroll: boolean
  onReroll: () => void
}) {
  const t = useTranslations('liveConsole')
  return (
    <div className="rounded-md border-l-2 border-primary/50 bg-muted/40 py-2 pl-3 pr-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('narration.readAloud')}
        </span>
        {canReroll && (
          <Button
            variant="ghost"
            size="sm"
            className="-my-1 h-6 px-1.5 text-xs text-muted-foreground"
            onClick={onReroll}
            title={t('narration.rerollTitle')}
          >
            🎲 {t('narration.reroll')}
          </Button>
        )}
      </div>
      <p className="italic text-muted-foreground">{t('narration.quote', { lore })}</p>
    </div>
  )
}

function fmtClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Short triple beep via the Web Audio API — no asset needed. If that fails
// (audio blocked/unavailable), the timer just keeps running visually.
function timerAlarm() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    for (let i = 0; i < 3; i++) {
      const at = ctx.currentTime + i * 0.45
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.35)
      osc.start(at)
      osc.stop(at + 0.36)
    }
    setTimeout(() => ctx.close(), 1700)
  } catch {
    /* Audio unavailable — timer stays purely visual */
  }
}

const TIMER_PRESETS = [60, 120, 180, 300] // seconds

/**
 * Manually started discussion timer for the day phase. The button in the header
 * shows the remaining time; a click opens a modal for setting, starting,
 * pausing and resetting. On expiry it beeps and the button pulses red. The
 * timer is pure UI state (no engine/server event).
 */
function DayTimer() {
  const t = useTranslations('liveConsole')
  const [open, setOpen] = useState(false)
  const [duration, setDuration] = useState(120)
  const [remaining, setRemaining] = useState(120)
  const [running, setRunning] = useState(false)
  const [expired, setExpired] = useState(false)

  // Second tick: only while running. Stop at 0 and sound the alarm.
  useEffect(() => {
    if (!running) return
    if (remaining <= 0) {
      setRunning(false)
      setExpired(true)
      timerAlarm()
      return
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(id)
  }, [running, remaining])

  // Escape closes the modal.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Pick a duration (presets/stepper) — resets and stops a running timer.
  function pick(secs: number) {
    const clamped = Math.min(1800, Math.max(30, secs))
    setDuration(clamped)
    setRemaining(clamped)
    setExpired(false)
    setRunning(false)
  }
  function toggle() {
    if (running) {
      setRunning(false)
      return
    }
    if (remaining <= 0) setRemaining(duration) // restart after expiry
    setExpired(false)
    setRunning(true)
  }
  function reset() {
    setRunning(false)
    setRemaining(duration)
    setExpired(false)
  }

  const counting = running || (remaining > 0 && remaining < duration)
  const startLabel = t(running ? 'timer.pause' : counting ? 'timer.resume' : 'timer.start')

  return (
    <>
      <Button
        type="button"
        variant={expired ? 'destructive' : counting ? 'default' : 'outline'}
        size="sm"
        onClick={() => setOpen(true)}
        className={cn('tabular-nums', expired && 'animate-pulse')}
        title={t('timer.title')}
      >
        ⏱ {counting || expired ? fmtClock(remaining) : t('timer.button')}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('timer.title')}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-border bg-background p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">⏱ {t('timer.title')}</h2>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)} aria-label={t('timer.close')}>
                ✕
              </Button>
            </div>

            <div
              className={cn(
                'text-center text-6xl font-bold tabular-nums',
                expired ? 'text-destructive' : running ? 'text-primary' : 'text-foreground',
              )}
            >
              {fmtClock(remaining)}
            </div>
            <p className="mb-4 mt-1 h-5 text-center text-sm font-medium text-destructive">
              {expired ? t('timer.expired') : ''}
            </p>

            <div className="mb-3 flex flex-wrap justify-center gap-2">
              {TIMER_PRESETS.map((secs) => (
                <Button
                  key={secs}
                  variant={duration === secs ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => pick(secs)}
                >
                  {t('timer.minutes', { minutes: secs / 60 })}
                </Button>
              ))}
            </div>

            <div className="mb-5 flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" onClick={() => pick(duration - 30)} aria-label={t('timer.less')}>
                −30s
              </Button>
              <Button variant="outline" size="sm" onClick={() => pick(duration + 30)} aria-label={t('timer.more')}>
                +30s
              </Button>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" onClick={toggle}>
                {startLabel}
              </Button>
              <Button variant="outline" onClick={reset} disabled={!running && remaining === duration}>
                {t('timer.reset')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * The rusty sword knight was devoured: the moderator picks the nearest werewolf clockwise,
 * who falls ill and dies on the morning of the day after next. Stays visible until a
 * wolf is named (own selection state, independent of the step input fields).
 */
function RustyDesignateCard({
  knightName,
  wolves,
  busy,
  onDesignate,
}: {
  knightName: string
  wolves: LivePlayerState[]
  busy: boolean
  onDesignate: (playerId: string) => void
}) {
  const t = useTranslations('liveConsole')
  const [pick, setPick] = useState('')
  return (
    <Card className="border-amber-500/70 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-amber-400">
          🗡️ {t('rusty.title', { name: knightName })}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-sm">{t('rusty.instruction')}</p>
        {wolves.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('rusty.noWolves')}</p>
        ) : (
          <div className="flex gap-2">
            <PlayerSelect players={wolves} value={pick} onChange={setPick} placeholder={t('rusty.pickWolf')} />
            <Button
              variant="secondary"
              disabled={busy || !pick}
              onClick={() => {
                onDesignate(pick)
                setPick('')
              }}
            >
              {t('rusty.infect')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Reminder of the pending knight effect: an already named werewolf dies from the rusty
 * blade. Stays visible until he actually falls on the morning of the day after next.
 */
function RustyReminder({ wolfName, diesThisNight }: { wolfName: string; diesThisNight: boolean }) {
  const t = useTranslations('liveConsole')
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2.5 text-sm">
      <span aria-hidden>🗡️</span>
      <span>
        {t.rich(diesThisNight ? 'rusty.reminderTonight' : 'rusty.reminderLater', {
          name: wolfName,
          strong: (chunks) => <strong>{chunks}</strong>,
        })}
      </span>
    </div>
  )
}

/**
 * Reminder of the house rule "reveal roles after death". Only appears if the rule was
 * chosen for this game AND there is currently something to reveal.
 *
 * Names the cards explicitly so the moderator does not have to look them up. A role that
 * has not been assigned yet is explicitly called out as such — assigning it first and
 * then revealing it is the right order.
 */
/**
 * Role name for mid-sentence use: the German catalog names carry the article capitalised
 * ("Die Seherin"), which looks wrong in "Anna war Die Seherin". Only lowercase the definite
 * article — proper names like "Goethe" or "Graf Zahl" stay untouched. English names have no
 * article and are used as is.
 */
function roleNameInline(name: string, locale: Locale): string {
  if (locale !== 'de') return name
  return /^(Der|Die|Das) /.test(name) ? name[0].toLowerCase() + name.slice(1) : name
}

function RevealReminder({ dead }: { dead: LivePlayerState[] }) {
  const t = useTranslations('liveConsole')
  const catalog = useCatalog()
  const locale = useAppLocale()
  if (dead.length === 0) return null
  const known = dead.filter((p) => p.roleId)
  const unknown = dead.filter((p) => !p.roleId)
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2.5 text-sm">
      <span aria-hidden>🃏</span>
      <div className="flex flex-col gap-1">
        <span>
          {t.rich('revealReminder.title', {
            count: dead.length,
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </span>
        {known.length > 0 && (
          <ul className="flex flex-col gap-0.5">
            {known.map((p) => (
              <li key={p.playerId} className="flex items-center gap-1.5 text-xs">
                <RoleIcon roleId={p.roleId!} size={13} />
                {t.rich('revealReminder.was', {
                  name: p.displayName,
                  role: roleNameInline(roleName(catalog, p.roleId!), locale),
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </li>
            ))}
          </ul>
        )}
        {unknown.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {t('revealReminder.unassigned', { names: unknown.map((p) => p.displayName).join(', ') })}
          </span>
        )}
      </div>
    </div>
  )
}

function PlayerSelect({
  players,
  value,
  onChange,
  placeholder,
  showRoles = true,
}: {
  players: LivePlayerState[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
  /** Role after the name — off under spoiler protection, otherwise opening the dropdown gives it away. */
  showRoles?: boolean
}) {
  const t = useTranslations('liveConsole')
  const catalog = useCatalog()
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder ?? t('playerSelect.placeholder')}</option>
      {players.map((p) => (
        <option key={p.playerId} value={p.playerId}>
          {p.displayName}
          {showRoles && p.roleId ? ` (${roleName(catalog, p.roleId)})` : ''}
        </option>
      ))}
    </Select>
  )
}

interface ControlProps {
  step: ModeratorStep
  state: LiveState
  living: LivePlayerState[]
  busy: boolean
  /** Is the highlighted button in this card? (otherwise at the bottom on "Weiter") */
  primary: boolean
  target: string
  setTarget: (v: string) => void
  loverA: string
  setLoverA: (v: string) => void
  loverB: string
  setLoverB: (v: string) => void
  revealId: string
  setRevealId: (v: string) => void
  send: (type: string, payload?: Record<string, unknown>, advance?: boolean) => void
  /** Spoiler protection active (village awake, not revealed)? */
  concealed: boolean
  onReveal: () => void
}

function StepControl(props: ControlProps) {
  const { step, state, living, busy, target, setTarget, send, primary } = props
  const t = useTranslations('liveConsole')
  const catalog = useCatalog()
  const c = step.control
  const nameOf = (id: string | null) => state.players.find((x) => x.playerId === id)?.displayName ?? '—'
  // The action button is only highlighted while the next click belongs here;
  // afterwards it steps back and "Weiter" takes over the highlight.
  const actionVariant = primary ? 'default' : 'secondary'
  // Acknowledgements: show in black and white that the input has arrived.
  const loverPair = state.players.find((p) => p.loverId)
  const lovers = loverPair
    ? ([loverPair.displayName, nameOf(loverPair.loverId)] as const)
    : null
  const charmedNames = state.players.filter((p) => p.charmed).map((p) => p.displayName)
  // Harlot in the wolf den: the wolves eat HER instead of their chosen victim —
  // she is also the one the witch is shown as the werewolf victim.
  const denId = whoreInWolfDenId(state as unknown as EngineState)
  const wolfVictimId = werewolfVictimId(state as unknown as EngineState)

  switch (c.kind) {
    case 'next':
      return null

    case 'reveal': {
      const revealed = state.players.find((p) => p.playerId === props.revealId)
      return (
        <div className="flex flex-col gap-2">
          <PlayerSelect players={living} value={props.revealId} onChange={props.setRevealId} placeholder={t('control.checkPlayer')} />
          {revealed && revealed.roleId && (
            <div className="rounded-md bg-accent/40 px-3 py-2 text-sm">
              {t.rich('control.trueRole', { role: roleName(catalog, revealed.roleId), strong: (chunks) => <strong>{chunks}</strong> })}
            </div>
          )}
          {revealed && !revealed.roleId && (
            <RevealAssign
              player={revealed}
              unassignedRoles={state.unassignedRoles}
              busy={busy}
              onAssign={(roleId) => send('RoleAssigned', { playerId: revealed.playerId, roleId })}
            />
          )}
        </div>
      )
    }

    case 'victim':
      return (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <PlayerSelect players={living} value={target} onChange={setTarget} />
            <Button
              variant={actionVariant}
              disabled={busy || !target}
              onClick={() => send('WerewolfVictim', { targetId: target })}
            >
              {t('control.chooseVictim')}
            </Button>
          </div>
          {state.pendingVictimId && <Picked label={t('control.werewolfVictim')} name={nameOf(state.pendingVictimId)} />}
          {denId && denId !== state.pendingVictimId && (
            <p className="text-xs font-medium text-amber-400">
              {t.rich('control.harlotInDen', { name: nameOf(denId), strong: (chunks) => <strong>{chunks}</strong> })}
            </p>
          )}
        </div>
      )

    case 'extraVictim':
      return (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <PlayerSelect players={living} value={target} onChange={setTarget} />
            <Button
              variant={actionVariant}
              disabled={busy || !target}
              onClick={() => send('BigBadWolfVictim', { targetId: target })}
            >
              {t('control.extraVictim')}
            </Button>
          </div>
          {state.pendingExtraVictimId && (
            <Picked label={t('control.secondVictim')} name={nameOf(state.pendingExtraVictimId)} />
          )}
        </div>
      )

    case 'infect':
      return (
        <div className="flex gap-2">
          <PlayerSelect players={living} value={target} onChange={setTarget} />
          <Button variant={actionVariant} disabled={busy || !target} onClick={() => send('Infected', { targetId: target })}>
            {t('control.infect')}
          </Button>
        </div>
      )

    case 'whoreVisit': {
      // Harlot stays with another person (not with herself).
      const candidates = living.filter((p) => p.roleId !== 'harlot')
      return (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <PlayerSelect players={candidates} value={target} onChange={setTarget} placeholder={t('control.pickHost')} />
            <Button
              variant={actionVariant}
              disabled={busy || !target}
              onClick={() => send('WhoreVisit', { targetId: target })}
            >
              {t('control.stayOver')}
            </Button>
          </div>
          {state.whoreHostId && (
            <Picked
              label={denId ? t('control.staysWithWolf') : t('control.staysWith')}
              name={nameOf(state.whoreHostId)}
            />
          )}
        </div>
      )
    }

    case 'dogBlock': {
      // Dog guards a person and blocks their night ability (not himself).
      const candidates = living.filter((p) => p.roleId !== 'dog')
      return (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <PlayerSelect players={candidates} value={target} onChange={setTarget} placeholder={t('control.guardPerson')} />
            <Button variant={actionVariant} disabled={busy || !target} onClick={() => send('DogBlock', { targetId: target })}>
              {t('control.guard')}
            </Button>
          </div>
          {state.blockedId && <Picked label={t('control.blocked')} name={nameOf(state.blockedId)} />}
        </div>
      )
    }

    case 'poet':
      return (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <PlayerSelect players={living} value={target} onChange={setTarget} placeholder={t('control.pickPoet')} />
            <Button
              variant={actionVariant}
              disabled={busy || !target}
              onClick={() => send('PoetChosen', { targetId: target })}
            >
              {t('control.makePoet')}
            </Button>
          </div>
          {state.poetId && <Picked label={t('control.poet')} name={nameOf(state.poetId)} />}
        </div>
      )

    case 'gullMark': {
      // Hit heads stay hit: already marked people (and the gull herself) are no longer
      // sensible targets and drop out of the selection.
      const marked = new Set(state.gullMarkedIds)
      // Only the players still alive count towards the win — the counter and name list
      // therefore refer to them (hit dead players stay marked in the overview).
      const others = living.filter((p) => p.roleId !== 'gull')
      const candidates = others.filter((p) => !marked.has(p.playerId))
      const hitNames = others.filter((p) => marked.has(p.playerId)).map((p) => p.displayName)
      return (
        <div className="flex flex-col gap-1.5">
          {candidates.length === 0 ? (
            <p className="text-sm font-medium text-emerald-400">{t('control.gullDone')}</p>
          ) : (
            <div className="flex gap-2">
              <PlayerSelect players={candidates} value={target} onChange={setTarget} placeholder={t('control.gullPick')} />
              <Button
                variant={actionVariant}
                disabled={busy || !target}
                onClick={() => send('GullMark', { targetId: target })}
              >
                💩 {t('control.gullMark')}
              </Button>
            </div>
          )}
          {hitNames.length > 0 && (
            <Picked
              label={t('control.gullHit', { hit: hitNames.length, total: others.length })}
              name={hitNames.join(', ')}
            />
          )}
        </div>
      )
    }

    case 'lovers':
      return (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <PlayerSelect players={state.players} value={props.loverA} onChange={props.setLoverA} placeholder={t('control.loverA')} />
            <PlayerSelect players={state.players} value={props.loverB} onChange={props.setLoverB} placeholder={t('control.loverB')} />
          </div>
          <Button
            variant={actionVariant}
            disabled={busy || !props.loverA || !props.loverB || props.loverA === props.loverB}
            onClick={() => send('LoversChosen', { aId: props.loverA, bId: props.loverB })}
          >
            {t('control.setLovers')}
          </Button>
          {lovers && <Picked label={t('control.lovers')} name={`${lovers[0]} ♥ ${lovers[1]}`} />}
        </div>
      )

    case 'charm':
      return (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <PlayerSelect players={living} value={props.loverA} onChange={props.setLoverA} placeholder={t('control.charmTarget1')} />
            <PlayerSelect players={living} value={props.loverB} onChange={props.setLoverB} placeholder={t('control.charmTarget2')} />
          </div>
          <Button
            variant={actionVariant}
            disabled={busy || (!props.loverA && !props.loverB)}
            onClick={() => send('Charmed', { targetIds: [props.loverA, props.loverB].filter(Boolean) })}
          >
            {t('control.charm')}
          </Button>
          {charmedNames.length > 0 && <Picked label={t('control.charmed')} name={charmedNames.join(', ')} />}
        </div>
      )

    case 'side': {
      const dog = state.players.find((p) => p.roleId === 'wolf-hound' && p.alive)
      if (!dog) return <p className="text-sm text-muted-foreground">{t('control.noWolfHound')}</p>
      return (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <Button variant={actionVariant} disabled={busy} onClick={() => send('SideChosen', { playerId: dog.playerId, side: 'village' })}>
              → {t('control.sideVillage')}
            </Button>
            <Button variant={actionVariant} disabled={busy} onClick={() => send('SideChosen', { playerId: dog.playerId, side: 'werewolves' })}>
              → {t('control.sideWerewolves')}
            </Button>
          </div>
          {dog.faction !== 'variable' && (
            <Picked
              label={t('control.sideChosen')}
              name={dog.faction === 'werewolves' ? t('control.sideChosenWerewolves') : t('control.sideChosenVillage')}
            />
          )}
        </div>
      )
    }

    case 'witch': {
      const victim = state.players.find((p) => p.playerId === wolfVictimId)
      return (
        <div className="flex flex-col gap-2">
          <div className="text-sm">
            {t.rich('control.witchVictim', {
              name: victim ? victim.displayName : t('control.witchNoVictim'),
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
            {denId && <span className="text-muted-foreground"> ({t('control.harlotWithWolf')})</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={actionVariant}
              disabled={busy || !state.witchHealAvailable || !wolfVictimId}
              onClick={() => send('WitchHeal')}
            >
              <Icon name="potion-heal" size={18} /> {t('control.heal')}
            </Button>
            <PlayerSelect players={living} value={target} onChange={setTarget} placeholder={t('control.poisonPick')} />
            <Button
              variant={actionVariant}
              disabled={busy || !state.witchPoisonAvailable || !target}
              onClick={() => send('WitchPoison', { targetId: target })}
            >
              <Icon name="potion-poison" size={18} /> {t('control.poison')}
            </Button>
          </div>
          {state.healedThisNight && <Picked label={t('control.healSaves')} name={nameOf(wolfVictimId)} />}
          {state.poisonedId && <Picked label={t('control.poisonHits')} name={nameOf(state.poisonedId)} />}
        </div>
      )
    }

    case 'captain': {
      const captain = state.players.find((p) => p.isCaptain)
      return (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <PlayerSelect
              players={state.players}
              value={target}
              onChange={setTarget}
              placeholder={t('control.pickMayor')}
              showRoles={!props.concealed}
            />
            <Button variant={actionVariant} disabled={busy || !target} onClick={() => send('CaptainElected', { playerId: target })}>
              {t('control.appoint')}
            </Button>
          </div>
          {captain && <Picked label={t('control.mayor')} name={captain.displayName} />}
        </div>
      )
    }

    case 'resolve': {
      // Merged closing step: first resolve, then — on the same card — announce the
      // dead and start the day. Resolving is a pure calculation step; giving it
      // its own page was a click without content.
      if (!state.nightResolved) {
        return (
          <Button disabled={busy} onClick={() => send('NightResolved')}>
            {t('control.resolveNight')}
          </Button>
        )
      }
      // Dead of this night: died in the current round. The lynching only happens
      // during the day (after this step), so it cannot be included here yet.
      const nightDeaths = state.players
        .filter((p) => !p.alive && p.diedRound === state.round)
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
      return (
        <div className="flex flex-col gap-3">
          <NightDeaths
            deaths={nightDeaths}
            concealed={props.concealed}
            rolesPublic={Boolean(state.revealRolesOnDeath)}
            onReveal={props.onReveal}
          />
          <Button
            className="self-start"
            disabled={busy || Boolean(state.pendingHunterId)}
            onClick={() => send('DayStarted')}
          >
            {state.pendingHunterId ? t('control.hunterFirst') : t('control.startDay')}
          </Button>
        </div>
      )
    }

    case 'startNight':
      return (
        <Button disabled={busy} onClick={() => send('NightStarted')}>
          {state.round === 0 ? t('control.startFirstNight') : t('control.startNextNight')}
        </Button>
      )

    case 'lynch':
      return (
        <div className="flex gap-2">
          <PlayerSelect
            players={living}
            value={target}
            onChange={setTarget}
            placeholder={t('control.lynchPick')}
            showRoles={!props.concealed}
          />
          <Button
            variant="destructive"
            disabled={busy || !target}
            onClick={() => send('Lynched', { targetId: target }, true)}
          >
            {t('control.lynch')}
          </Button>
        </div>
      )

    case 'model': {
      const child = state.players.find((p) => p.roleId === 'wild-child' && p.alive)
      if (!child) return <p className="text-sm text-muted-foreground">{t('control.noWildChild')}</p>
      return (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <PlayerSelect
              players={living.filter((p) => p.playerId !== child.playerId)}
              value={target}
              onChange={setTarget}
              placeholder={t('control.modelPick')}
            />
            <Button
              variant={actionVariant}
              disabled={busy || !target}
              onClick={() => send('WildChildModel', { childId: child.playerId, modelId: target })}
            >
              {t('control.rememberModel')}
            </Button>
          </div>
          {child.modelId && <Picked label={t('control.model')} name={nameOf(child.modelId)} />}
        </div>
      )
    }

    case 'whiteWolfKill':
      return (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <PlayerSelect players={living} value={target} onChange={setTarget} placeholder={t('control.whiteWolfPick')} />
            <Button
              variant={actionVariant}
              disabled={busy || !target}
              onClick={() => send('WhiteWolfKill', { targetId: target })}
            >
              {t('control.whiteWolfKill')}
            </Button>
          </div>
          {state.pendingWhiteWolfKillId && (
            <Picked label={t('control.whiteWolfKills')} name={nameOf(state.pendingWhiteWolfKillId)} />
          )}
        </div>
      )

    case 'openingDay':
      return (
        <Button disabled={busy} onClick={() => send('OpeningDayStarted')}>
          {t('control.openingDay')}
        </Button>
      )

    default:
      return null
  }
}

/**
 * Start of the day: list of everyone who died during the past night. Under spoiler protection
 * only the names — they are announced anyway. Role (except with the house rule "Rollen
 * aufdecken") and cause of death give away more (heartbreak, witch's poison, rusty blade …)
 * and appear only on request.
 */
function NightDeaths({
  deaths,
  concealed,
  rolesPublic,
  onReveal,
}: {
  deaths: LivePlayerState[]
  concealed: boolean
  rolesPublic: boolean
  onReveal: () => void
}) {
  const t = useTranslations('liveConsole')
  const catalog = useCatalog()
  const showRoles = !concealed || rolesPublic
  const hidesRoles = !showRoles && deaths.some((p) => p.roleId)
  const hidesCauses = concealed && deaths.some((p) => p.deathCause)
  if (deaths.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2.5 text-sm">
        <Icon name="sun" size={18} />
        <span>{t('nightDeaths.none')}</span>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
        <Icon name="skull" size={16} />
        {t('nightDeaths.title', { count: deaths.length })}
      </p>
      <ul className="flex flex-col gap-1.5">
        {deaths.map((p) => (
          <li key={p.playerId} className="flex items-center gap-2 text-sm">
            <span className="font-medium line-through">{p.displayName}</span>
            {showRoles && p.roleId && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <RoleIcon roleId={p.roleId} size={13} />
                {roleName(catalog, p.roleId)}
              </span>
            )}
            {!concealed && p.deathCause && (
              <span className="ml-auto rounded bg-destructive/25 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                {deathCauseLabel(catalog, p.deathCause)}
              </span>
            )}
          </li>
        ))}
      </ul>
      {(hidesRoles || hidesCauses) && (
        <button
          type="button"
          onClick={onReveal}
          className="self-start text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          👁️ {hidesRoles ? t('nightDeaths.showRolesAndCauses') : t('nightDeaths.showCauses')}
        </button>
      )}
    </div>
  )
}

/**
 * Toggle for the moderator overview while the village is awake. Concealed: a calm
 * hint — roles, status and secret night info only on request. Revealed:
 * clearly marked so nobody forgets to cover the screen again.
 */
function SpoilerToggle({
  concealed,
  aliveCount,
  total,
  onToggle,
}: {
  concealed: boolean
  aliveCount: number
  total: number
  onToggle: () => void
}) {
  const t = useTranslations('liveConsole')
  if (concealed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-3 rounded-lg border border-dashed border-border px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
      >
        <span aria-hidden className="text-lg leading-none">
          🙈
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium">{t('spoiler.concealed')}</span>
          <span className="text-xs text-muted-foreground">
            {t('spoiler.concealedHint', { alive: aliveCount, total })}
          </span>
        </span>
        <span className="shrink-0 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium">
          {t('spoiler.reveal')}
        </span>
      </button>
    )
  }
  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2">
      <span aria-hidden className="text-lg leading-none">
        👁️
      </span>
      <span className="min-w-0 flex-1 text-sm">
        <strong>{t('spoiler.revealed')}</strong>{' '}
        <span className="text-muted-foreground">{t('spoiler.revealedHint')}</span>
      </span>
      <Button variant="outline" size="sm" onClick={onToggle} className="shrink-0">
        {t('spoiler.conceal')}
      </Button>
    </div>
  )
}

/**
 * Concealed placeholder for an open secret task (currently: rusty blade) —
 * deliberately without details, since even its name would give away a dead player's role.
 */
function SecretTaskHint({ onReveal }: { onReveal: () => void }) {
  const t = useTranslations('liveConsole')
  return (
    <button
      type="button"
      onClick={onReveal}
      className="flex items-center gap-3 rounded-lg border border-dashed border-primary/60 bg-primary/5 px-3 py-2.5 text-left ring-1 ring-primary/40 transition-colors hover:bg-primary/10"
    >
      <span aria-hidden className="text-lg leading-none">
        🔒
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium">{t('secretTask.title')}</span>
        <span className="text-xs text-muted-foreground">{t('secretTask.hint')}</span>
      </span>
      <span className="shrink-0 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground">
        {t('secretTask.reveal')}
      </span>
    </button>
  )
}

function Picked({ label, name }: { label: string; name: string }) {
  return (
    <p className="text-xs font-medium text-emerald-400">
      ✓ {label}: <strong>{name}</strong>
    </p>
  )
}

/** Assignment on waking: which person holds this role? */
function AssignGate({
  roleId,
  remaining,
  candidates,
  holders,
  busy,
  onAssign,
}: {
  roleId: string
  remaining: number
  candidates: LivePlayerState[]
  holders: LivePlayerState[]
  busy: boolean
  onAssign: (playerId: string) => void
}) {
  const t = useTranslations('liveConsole')
  const catalog = useCatalog()
  const [pick, setPick] = useState('')
  const role = roleName(catalog, roleId)
  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed border-primary/60 bg-primary/5 p-2.5">
      <p className="text-sm font-medium">
        {remaining > 1
          ? t('assign.questionRemaining', { role, count: remaining })
          : t('assign.question', { role })}
      </p>
      {holders.length > 0 && (
        <p className="text-xs font-medium text-emerald-400">
          ✓ {holders.map((h) => h.displayName).join(', ')}
        </p>
      )}
      {candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('assign.noCandidates')}</p>
      ) : (
        <div className="flex gap-2">
          <PlayerSelect players={candidates} value={pick} onChange={setPick} placeholder={t('assign.pickPerson')} />
          <Button
            disabled={busy || !pick}
            onClick={() => {
              onAssign(pick)
              setPick('')
            }}
          >
            {t('assign.assign')}
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * Manual assignment for roles that do not wake up at night (hunter, elder, rusty sword knight …):
 * without a binding their death effects do not trigger. Unobtrusive as a collapsible panel.
 */
function ManualAssignPanel({
  players,
  unassignedRoles,
  busy,
  onAssign,
}: {
  players: LivePlayerState[]
  unassignedRoles: string[]
  busy: boolean
  onAssign: (playerId: string, roleId: string) => void
}) {
  const t = useTranslations('liveConsole')
  const catalog = useCatalog()
  const [picks, setPicks] = useState<Record<string, string>>({})
  const distinct = [...new Set(unassignedRoles)]
  if (players.length === 0 || unassignedRoles.length === 0) return null
  return (
    <details className="rounded-lg border border-border">
      <summary className="cursor-pointer px-3 py-2 text-sm text-muted-foreground">
        {t('assign.manualTitle', { count: unassignedRoles.length })}
      </summary>
      <div className="flex flex-col gap-2 px-3 pb-3">
        <p className="text-xs text-muted-foreground">{t('assign.manualHint')}</p>
        {players.map((p) => (
          <div key={p.playerId} className="flex items-center gap-2">
            <span className="min-w-20 flex-1 text-sm">{p.displayName}</span>
            <Select
              value={distinct.includes(picks[p.playerId] ?? '') ? picks[p.playerId] : ''}
              onChange={(e) => setPicks((s) => ({ ...s, [p.playerId]: e.target.value }))}
            >
              <option value="">{t('assign.rolePlaceholder')}</option>
              {distinct.map((r) => (
                <option key={r} value={r}>
                  {roleName(catalog, r)}
                </option>
              ))}
            </Select>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy || !picks[p.playerId]}
              onClick={() => onAssign(p.playerId, picks[p.playerId]!)}
            >
              {t('assign.ok')}
            </Button>
          </div>
        ))}
      </div>
    </details>
  )
}

/** Seer checks a person whose role has not been assigned yet → bind it from the card. */
function RevealAssign({
  player,
  unassignedRoles,
  busy,
  onAssign,
}: {
  player: LivePlayerState
  unassignedRoles: string[]
  busy: boolean
  onAssign: (roleId: string) => void
}) {
  const t = useTranslations('liveConsole')
  const catalog = useCatalog()
  const [pick, setPick] = useState('')
  const distinct = [...new Set(unassignedRoles)]
  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed border-primary/60 bg-primary/5 p-2.5">
      <p className="text-sm">
        {t.rich('assign.revealUnassigned', { name: player.displayName, strong: (chunks) => <strong>{chunks}</strong> })}
      </p>
      <div className="flex gap-2">
        <Select value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">{t('assign.rolePlaceholder')}</option>
          {distinct.map((r) => (
            <option key={r} value={r}>
              {roleName(catalog, r)}
            </option>
          ))}
        </Select>
        <Button disabled={busy || !pick} onClick={() => onAssign(pick)}>
          {t('assign.assignAndReveal')}
        </Button>
      </div>
    </div>
  )
}
