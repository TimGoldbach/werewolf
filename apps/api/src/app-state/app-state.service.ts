import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AppStateService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns the (single) app state and creates it on demand. */
  async getState() {
    return this.prisma.appState.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } })
  }

  async isTestMode(): Promise<boolean> {
    const state = await this.prisma.appState.findUnique({ where: { id: 1 } })
    return state?.testMode ?? false
  }

  async setTestMode(active: boolean): Promise<{ active: boolean; purged: { games: number; players: number } }> {
    const state = await this.prisma.appState.upsert({
      where: { id: 1 },
      update: { testMode: active },
      create: { id: 1, testMode: active },
    })
    const purged = active ? { games: 0, players: 0 } : await this.purgeGenerated()
    return { active: state.testMode, purged }
  }

  /** Deletes all data generated in test mode (games first, including cascade, then players). */
  async purgeGenerated(): Promise<{ games: number; players: number }> {
    const games = await this.prisma.game.deleteMany({ where: { generated: true } })
    const players = await this.prisma.player.deleteMany({ where: { generated: true } })
    return { games: games.count, players: players.count }
  }
}
