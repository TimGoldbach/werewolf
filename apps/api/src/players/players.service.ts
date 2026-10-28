import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { CreatePlayerInput, Player, UpdatePlayerInput } from '@werewolf/shared'
import { AppStateService } from '../app-state/app-state.service'
import { PrismaService } from '../prisma/prisma.service'
import { apiError } from '@werewolf/shared'

type PlayerRow = { id: string; displayName: string; active: boolean; createdAt: Date }

@Injectable()
export class PlayersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appState: AppStateService,
  ) {}

  private toDto(p: PlayerRow): Player {
    return { id: p.id, displayName: p.displayName, active: p.active, createdAt: p.createdAt.toISOString() }
  }

  async list(includeArchived: boolean): Promise<Player[]> {
    const players = await this.prisma.player.findMany({
      where: includeArchived ? {} : { active: true },
      orderBy: { displayName: 'asc' },
    })
    return players.map((p) => this.toDto(p))
  }

  async create(input: CreatePlayerInput): Promise<Player> {
    try {
      const generated = await this.appState.isTestMode()
      const p = await this.prisma.player.create({ data: { displayName: input.displayName, generated } })
      return this.toDto(p)
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(apiError('PLAYER_NAME_TAKEN', 'This name is already taken.'))
      }
      throw e
    }
  }

  async update(id: string, input: UpdatePlayerInput): Promise<Player> {
    try {
      const p = await this.prisma.player.update({ where: { id }, data: input })
      return this.toDto(p)
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') throw new NotFoundException(apiError('PLAYER_NOT_FOUND', 'Player not found.'))
        if (e.code === 'P2002') throw new ConflictException(apiError('PLAYER_NAME_TAKEN', 'This name is already taken.'))
      }
      throw e
    }
  }
}
