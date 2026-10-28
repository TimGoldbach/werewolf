import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import {
  apiError,
  type CreateQuickGameInput,
  getRole,
  ROLE_CATALOG_VERSION,
  type SetGameFeedbackInput,
} from '@werewolf/shared'
import { AppStateService } from '../app-state/app-state.service'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appState: AppStateService,
  ) {}

  private assertRolesExist(roleIds: string[]): void {
    const unknown = roleIds.filter((id) => !getRole(id))
    if (unknown.length > 0) {
      throw new BadRequestException(
        apiError('UNKNOWN_ROLES', `Unknown role(s): ${unknown.join(', ')}`, { roleIds: unknown }),
      )
    }
  }

  async createQuick(input: CreateQuickGameInput) {
    this.assertRolesExist(input.players.map((p) => p.roleId))
    const roleSetVersion = input.roleSetVersion ?? ROLE_CATALOG_VERSION
    const playedAt = input.playedAt ? new Date(input.playedAt) : new Date()
    const winners = input.players.filter((p) => p.isWinner).map((p) => p.playerId)
    const generated = await this.appState.isTestMode()

    try {
      return await this.prisma.game.create({
        data: {
          mode: 'QUICK',
          status: 'FINISHED',
          playedAt,
          roleSetVersion,
          winningCondition: input.winningCondition,
          notes: input.notes,
          generated,
          moderatorId: input.moderatorId ?? null,
          players: {
            create: input.players.map((p) => ({
              playerId: p.playerId,
              roleId: p.roleId,
              roleVersion: roleSetVersion,
              finalFaction: p.finalFaction ?? getRole(p.roleId)?.faction ?? null,
              isWinner: p.isWinner,
              survived: p.survived ?? null,
              diedRound: p.diedRound ?? null,
              deathCause: p.deathCause ?? null,
            })),
          },
          events: {
            create: [
              { seq: 0, type: 'GameCreated', payload: { mode: 'QUICK', roleSetVersion } },
              {
                seq: 1,
                type: 'GameEnded',
                payload: { winningCondition: input.winningCondition, winners },
              },
            ],
          },
        },
        include: { players: true, moderator: true },
      })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2003') throw new BadRequestException(apiError('UNKNOWN_PLAYERS', 'Unknown player id(s).'))
        if (e.code === 'P2002') throw new BadRequestException(apiError('DUPLICATE_PLAYERS', 'A player appears more than once in the game.'))
      }
      throw e
    }
  }

  /**
   * Edits the result projection of an already finished game (date, moderator, winning
   * condition, notes and, per person, role/winner/survival). Live games can only be edited
   * once finished — a running game is controlled through the live console.
   * The event log is left untouched; the GamePlayer rows are authoritative for display and stats.
   */
  async update(id: string, input: CreateQuickGameInput) {
    this.assertRolesExist(input.players.map((p) => p.roleId))
    const game = await this.prisma.game.findUnique({
      where: { id },
      select: { status: true, roleSetVersion: true },
    })
    if (!game) throw new NotFoundException(apiError('GAME_NOT_FOUND', 'Game not found.'))
    if (game.status !== 'FINISHED') {
      throw new ConflictException(
        apiError('GAME_NOT_FINISHED', 'Only finished games can be edited afterwards.'),
      )
    }
    const roleSetVersion = game.roleSetVersion
    const winnerIds = new Set(input.players.filter((p) => p.isWinner).map((p) => p.playerId))

    try {
      await this.prisma.$transaction(async (tx) => {
        // Preserve existing final factions: the engine changes factions dynamically
        // (wild child → wolf, wolf-hound side choice, cursed). The form does not carry a
        // faction — if we re-derived it from getRole(), the faction determined during the game
        // would be lost on every edit. So reuse the stored finalFaction for an unchanged
        // (person, role) pair.
        const existing = await tx.gamePlayer.findMany({
          where: { gameId: id },
          select: { playerId: true, roleId: true, finalFaction: true },
        })
        const priorFaction = new Map(existing.map((g) => [`${g.playerId}:${g.roleId}`, g.finalFaction]))

        await tx.game.update({
          where: { id },
          data: {
            playedAt: input.playedAt ? new Date(input.playedAt) : undefined,
            moderatorId: input.moderatorId ?? null,
            winningCondition: input.winningCondition,
            notes: input.notes ?? null,
          },
        })
        // Replace the projection completely (roles/outcome/people may have changed).
        await tx.gamePlayer.deleteMany({ where: { gameId: id } })
        await tx.gamePlayer.createMany({
          data: input.players.map((p) => ({
            gameId: id,
            playerId: p.playerId,
            roleId: p.roleId,
            roleVersion: roleSetVersion,
            finalFaction:
              p.finalFaction ??
              priorFaction.get(`${p.playerId}:${p.roleId}`) ??
              getRole(p.roleId)?.faction ??
              null,
            isWinner: winnerIds.has(p.playerId),
            survived: p.survived ?? null,
            diedRound: p.diedRound ?? null,
            deathCause: p.deathCause ?? null,
          })),
        })
      })
      return this.get(id)
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2003') throw new BadRequestException(apiError('UNKNOWN_PLAYERS', 'Unknown player id(s).'))
        if (e.code === 'P2002') throw new BadRequestException(apiError('DUPLICATE_PLAYERS', 'A player appears more than once in the game.'))
      }
      throw e
    }
  }

  /**
   * The group's feedback on the set of a finished game (1–5, `null` = withdraw).
   * Weights the set suggestions for the next game with the same player count. Only after
   * the game is over: before that, the set of a live game is not yet settled.
   */
  async setFeedback(id: string, input: SetGameFeedbackInput) {
    const game = await this.prisma.game.findUnique({ where: { id }, select: { status: true } })
    if (!game) throw new NotFoundException(apiError('GAME_NOT_FOUND', 'Game not found.'))
    if (game.status !== 'FINISHED') {
      throw new ConflictException(
        apiError('GAME_NOT_FINISHED', 'Set feedback is only possible once the game is over.'),
      )
    }
    try {
      return await this.prisma.game.update({
        where: { id },
        data: { setRating: input.setRating },
        select: { id: true, setRating: true },
      })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new NotFoundException(apiError('GAME_NOT_FOUND', 'Game not found.'))
      }
      throw e
    }
  }

  async list() {
    return this.prisma.game.findMany({
      orderBy: { playedAt: 'desc' },
      include: {
        moderator: { select: { id: true, displayName: true } },
        players: { include: { player: { select: { id: true, displayName: true } } } },
      },
    })
  }

  async get(id: string) {
    const game = await this.prisma.game.findUnique({
      where: { id },
      include: {
        moderator: { select: { id: true, displayName: true } },
        players: { include: { player: { select: { id: true, displayName: true } } } },
        events: { orderBy: { seq: 'asc' } },
      },
    })
    if (!game) throw new NotFoundException(apiError('GAME_NOT_FOUND', 'Game not found.'))
    return game
  }

  async remove(id: string): Promise<{ deleted: true }> {
    try {
      await this.prisma.game.delete({ where: { id } })
      return { deleted: true }
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new NotFoundException(apiError('GAME_NOT_FOUND', 'Game not found.'))
      }
      throw e
    }
  }
}
