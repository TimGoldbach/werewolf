import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  apiError,
  type CreateLiveGameInput,
  deriveState,
  type EngineEvent,
  evaluateWin,
  getRole,
  isEngineEventType,
  nightWakeSteps,
  ROLE_CATALOG_VERSION,
  type UpdateLiveSettingsInput,
  type WinResult,
} from '@werewolf/shared'
import { AppStateService } from '../app-state/app-state.service'
import { PrismaService } from '../prisma/prisma.service'

interface AppendEventInput {
  type: string
  payload?: Record<string, unknown>
}

/**
 * Version signal for live polling: the id of the newest event, plus a marker while the sound
 * is off — so switching the sound on one device makes the other devices reload the state too.
 */
function liveVersion(tipId: string | undefined, soundEnabled: boolean): string {
  const tip = tipId ?? '0'
  return soundEnabled ? tip : `${tip}:muted`
}

@Injectable()
export class LiveGamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appState: AppStateService,
  ) {}

  async create(input: CreateLiveGameInput): Promise<{ id: string }> {
    const unknown = input.roles.filter((r) => !getRole(r))
    if (unknown.length > 0) {
      throw new BadRequestException(
        apiError('UNKNOWN_ROLES', `Unknown role(s): ${[...new Set(unknown)].join(', ')}`, {
          roleIds: [...new Set(unknown)],
        }),
      )
    }
    const roleSetVersion = input.roleSetVersion ?? ROLE_CATALOG_VERSION
    const playedAt = input.playedAt ? new Date(input.playedAt) : new Date()
    const generated = await this.appState.isTestMode()

    const game = await this.prisma.game.create({
      data: {
        mode: 'LIVE',
        status: 'LIVE',
        playedAt,
        roleSetVersion,
        notes: input.notes,
        generated,
        moderatorId: input.moderatorId ?? null,
        revealRolesOnDeath: input.revealRolesOnDeath,
        showNarration: input.showNarration,
        soundEnabled: input.soundEnabled,
        // Roles are not bound to people yet — assignment happens live when each role
        // first wakes up (RoleAssigned events).
        players: {
          create: input.players.map((p) => ({
            playerId: p.playerId,
            roleId: null,
            roleVersion: roleSetVersion,
            finalFaction: null,
            isWinner: false,
          })),
        },
        events: {
          create: [
            {
              seq: 0,
              type: 'SetupCompleted',
              payload: {
                players: input.players.map((p) => ({ playerId: p.playerId })),
                roles: input.roles,
              },
            },
          ],
        },
      },
    })
    return { id: game.id }
  }

  /**
   * Lightweight version signal for live polling across several devices: the id of the most
   * recently appended event changes on EVERY change to the log (append as well as undo) — even
   * when the event count and highest seq happen to stay the same (undo + new append). This way
   * every device reliably knows when it has to reload the full state.
   */
  async getVersion(gameId: string): Promise<{ version: string; status: string }> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      select: { status: true, soundEnabled: true },
    })
    if (!game) throw new NotFoundException(apiError('GAME_NOT_FOUND', 'Game not found.'))
    const tip = await this.prisma.gameEvent.findFirst({
      where: { gameId },
      orderBy: { seq: 'desc' },
      select: { id: true },
    })
    return { version: liveVersion(tip?.id, game.soundEnabled), status: game.status }
  }

  /** Changes console settings of a running game; returns the new state like an event append. */
  async updateSettings(gameId: string, input: UpdateLiveSettingsInput) {
    const game = await this.prisma.game.findUnique({ where: { id: gameId }, select: { status: true } })
    if (!game) throw new NotFoundException(apiError('GAME_NOT_FOUND', 'Game not found.'))
    if (game.status !== 'LIVE') throw new ConflictException(apiError('GAME_ALREADY_FINISHED', 'Game is already finished.'))
    await this.prisma.game.update({ where: { id: gameId }, data: { soundEnabled: input.soundEnabled } })
    return this.getState(gameId)
  }

  async getState(gameId: string) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { players: { include: { player: { select: { id: true, displayName: true } } } } },
    })
    if (!game) throw new NotFoundException(apiError('GAME_NOT_FOUND', 'Game not found.'))

    // IMPORTANT: derive events AND version signal from ONE snapshot (a single findMany). Two
    // separate queries (findMany + a separate tip query) are not atomic under READ COMMITTED:
    // a concurrent append/undo in between would make `version` (tip id) no longer match the
    // returned events → the device would store a newer version than its state reflects, and
    // on the next poll (version equality) never reload. The last row of this snapshot has the
    // highest seq and therefore the same id that getVersion returns as the tip.
    const rows = await this.prisma.gameEvent.findMany({ where: { gameId }, orderBy: { seq: 'asc' } })
    const events = rows.map((r) => ({ type: r.type, payload: r.payload }) as unknown as EngineEvent)
    const version = liveVersion(rows.length > 0 ? rows[rows.length - 1].id : undefined, game.soundEnabled)
    const state = deriveState(events)
    const proposedWinner: WinResult | null = state.winner ?? evaluateWin(state)
    const nameById = new Map(game.players.map((p) => [p.playerId, p.player.displayName]))
    const firstNight = state.round <= 1

    return {
      id: game.id,
      // Version signal for cross-device live polling (see getVersion).
      version,
      mode: game.mode,
      status: game.status,
      // House rule for this game — the console reminds the moderator of it.
      revealRolesOnDeath: game.revealRolesOnDeath,
      // Presentation: narration texts to read aloud shown or hidden.
      showNarration: game.showNarration,
      // Day/night soundscape on or off (switchable during the game).
      soundEnabled: game.soundEnabled,
      // EngineState fields: the console builds its script with the helpers from @werewolf/shared
      // directly on this projection — so every engine field must be included (only `winner` is
      // carried in proposedWinner). live-games.service.test.ts enforces this.
      round: state.round,
      // Drive the first day (mayor election) and the angel's opening day.
      nightsStarted: state.nightsStarted,
      openingDayUsed: state.openingDayUsed,
      phase: state.phase,
      players: state.players.map((p) => ({ ...p, displayName: nameById.get(p.playerId) ?? p.playerId })),
      witchHealAvailable: state.witchHealAvailable,
      witchPoisonAvailable: state.witchPoisonAvailable,
      pendingHunterId: state.pendingHunterId,
      pendingVictimId: state.pendingVictimId,
      pendingExtraVictimId: state.pendingExtraVictimId,
      pendingWhiteWolfKillId: state.pendingWhiteWolfKillId,
      poisonedId: state.poisonedId,
      protectedId: state.protectedId,
      healedThisNight: state.healedThisNight,
      whoreHostId: state.whoreHostId,
      blockedId: state.blockedId,
      nightResolved: state.nightResolved,
      poetId: state.poetId,
      gullMarkedIds: state.gullMarkedIds,
      brewerFeast: state.brewerFeast,
      pendingRustyKnightId: state.pendingRustyKnightId,
      rustyInfectedId: state.rustyInfectedId,
      rustyInfectedRound: state.rustyInfectedRound,
      unassignedRoles: state.unassignedRoles,
      wakeOrder: nightWakeSteps(state, firstNight),
      narration: state.narration,
      proposedWinner,
    }
  }

  async appendEvent(gameId: string, input: AppendEventInput) {
    if (!isEngineEventType(input.type)) {
      throw new BadRequestException(
        apiError('UNKNOWN_EVENT_TYPE', `Unknown event type: ${input.type}`),
      )
    }
    const game = await this.prisma.game.findUnique({ where: { id: gameId }, select: { status: true } })
    if (!game) throw new NotFoundException(apiError('GAME_NOT_FOUND', 'Game not found.'))
    // Do not mutate a finished game any further: a second device still shows active buttons for
    // up to one poll interval — a late tap must not corrupt the result.
    if (game.status !== 'LIVE') throw new ConflictException(apiError('GAME_ALREADY_FINISHED', 'Game is already finished.'))

    // Concurrency: with full co-moderation both devices can append an event at the same time.
    // They then read the same highest seq and would write the same next seq → the unique index
    // (gameId, seq) rejects the second insert with P2002. So we recompute the seq in a small
    // retry loop until the insert succeeds.
    for (let attempt = 0; ; attempt++) {
      const last = await this.prisma.gameEvent.findFirst({
        where: { gameId },
        orderBy: { seq: 'desc' },
        select: { seq: true },
      })
      try {
        await this.prisma.gameEvent.create({
          data: {
            gameId,
            seq: (last?.seq ?? -1) + 1,
            type: input.type,
            payload: (input.payload ?? {}) as object,
          },
        })
        break
      } catch (e) {
        const code = (e as { code?: string })?.code
        if (code === 'P2002' && attempt < 5) continue // collision: recompute seq and retry
        throw e
      }
    }
    return this.getState(gameId)
  }

  /** Undoes the most recently appended event (except the setup event, seq 0). */
  async undo(gameId: string) {
    const game = await this.prisma.game.findUnique({ where: { id: gameId }, select: { status: true } })
    if (!game) throw new NotFoundException(apiError('GAME_NOT_FOUND', 'Game not found.'))
    if (game.status !== 'LIVE') throw new ConflictException(apiError('GAME_ALREADY_FINISHED', 'Game is already finished.'))

    // Atomically delete the CURRENT tip: "read, then delete by id" would be a TOCTOU —
    // if another device appends an event in between, a non-tip event (in the middle) would be
    // deleted → seq gap, unchanged tip (the undo would stay invisible to other devices) and
    // later a seq collision in finish(). A single DELETE with a subquery determines the
    // tip within the same statement and therefore always hits the real current tip.
    await this.prisma.$executeRaw`
      DELETE FROM "GameEvent"
      WHERE id = (
        SELECT id FROM "GameEvent"
        WHERE "gameId" = ${gameId} AND seq > 0
        ORDER BY seq DESC
        LIMIT 1
      )`
    return this.getState(gameId)
  }

  /** Writes the final result projection (for stats) and finishes the game. */
  async finish(gameId: string, override?: { winningCondition?: string; winnerIds?: string[] }) {
    // Quick pre-check for the common "already finished" error (without a transaction).
    const existing = await this.prisma.game.findUnique({ where: { id: gameId }, select: { status: true } })
    if (!existing) throw new NotFoundException(apiError('GAME_NOT_FOUND', 'Game not found.'))
    if (existing.status !== 'LIVE') throw new ConflictException(apiError('GAME_ALREADY_FINISHED', 'Game is already finished.'))

    // The whole finishing logic runs in ONE transaction, inside a P2002 retry loop. Important:
    // - Events + state are loaded/derived fresh PER ATTEMPT INSIDE the transaction, so that
    //   the projection and the GameEnded seq reflect the same event log (no stale snapshot).
    // - The LIVE→FINISHED status flip is a conditional updateMany(where status LIVE): if two
    //   devices tap "finish" at the same time, they serialize on the Game row; the second one then
    //   hits 0 rows → ConflictException instead of a second GameEnded/duplicate projection.
    for (let attempt = 0; ; attempt++) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const rows = await tx.gameEvent.findMany({ where: { gameId }, orderBy: { seq: 'asc' } })
          const events = rows.map((r) => ({ type: r.type, payload: r.payload }) as unknown as EngineEvent)
          const state = deriveState(events)
          const proposed = state.winner ?? evaluateWin(state)
          const winningCondition = override?.winningCondition ?? proposed?.condition ?? 'none'
          const winnerIds = new Set(override?.winnerIds ?? proposed?.winnerIds ?? [])

          // For the stats every person needs a role. Anyone never assigned live (e.g. plain
          // villagers who never wake up) now gets one of the remaining deck roles in a stable
          // order.
          const leftover = [...state.unassignedRoles]
          const finalRole = new Map<string, { roleId: string; faction: string }>()
          for (const p of state.players) {
            if (p.roleId) {
              finalRole.set(p.playerId, { roleId: p.roleId, faction: p.faction })
            } else {
              const roleId = leftover.shift() ?? 'villager'
              finalRole.set(p.playerId, { roleId, faction: getRole(roleId)?.faction ?? 'village' })
            }
          }

          // Flip status LIVE→FINISHED atomically. 0 affected rows ⇒ another device was faster.
          const flipped = await tx.game.updateMany({
            where: { id: gameId, status: 'LIVE' },
            data: { status: 'FINISHED', winningCondition, rounds: state.round },
          })
          if (flipped.count === 0) throw new ConflictException(apiError('GAME_ALREADY_FINISHED', 'Game is already finished.'))

          for (const p of state.players) {
            const fin = finalRole.get(p.playerId)
            await tx.gamePlayer.updateMany({
              where: { gameId, playerId: p.playerId },
              data: {
                isWinner: winnerIds.has(p.playerId),
                survived: p.alive,
                diedRound: p.diedRound,
                deathCause: p.deathCause,
                roleId: fin?.roleId,
                finalFaction: fin?.faction ?? p.faction,
              },
            })
          }

          const lastSeq = rows.length > 0 ? rows[rows.length - 1].seq : -1
          await tx.gameEvent.create({
            data: {
              gameId,
              seq: lastSeq + 1,
              type: 'GameEnded',
              payload: { condition: winningCondition, winnerIds: [...winnerIds] },
            },
          })
        })
        break
      } catch (e) {
        if (e instanceof ConflictException) throw e // legitimate double finish: do not retry
        const code = (e as { code?: string })?.code
        if (code === 'P2002' && attempt < 5) continue // collision with a parallel append: retry
        throw e
      }
    }

    return this.getState(gameId)
  }
}
