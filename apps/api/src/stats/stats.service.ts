import { Injectable } from '@nestjs/common'
import {
  computeGlobalStats,
  computeLeaderboard,
  computePlayerRoleStats,
  computeRoleStats,
  computeSetSuggestions,
  DEFAULT_MIN_GAMES,
  isSetRating,
  type DeathCause,
  type Faction,
  type GameResultRecord,
  type WinCondition,
} from '@werewolf/shared'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  private async loadRecords(): Promise<GameResultRecord[]> {
    const games = await this.prisma.game.findMany({
      where: { status: 'FINISHED' },
      include: { players: true },
      orderBy: { playedAt: 'asc' },
    })
    return games.map((g) => ({
      gameId: g.id,
      playedAt: g.playedAt.toISOString(),
      mode: g.mode,
      winningCondition: (g.winningCondition ?? 'none') as WinCondition,
      moderatorId: g.moderatorId,
      rounds: g.rounds,
      revealRolesOnDeath: g.revealRolesOnDeath,
      setRating: isSetRating(g.setRating) ? g.setRating : null,
      players: g.players.map((p) => ({
        playerId: p.playerId,
        // Finished games always have a final role; the fallback is only a safeguard.
        roleId: p.roleId ?? 'villager',
        finalFaction: (p.finalFaction as Faction | null) ?? null,
        isWinner: p.isWinner,
        survived: p.survived,
        diedRound: p.diedRound,
        deathCause: (p.deathCause as DeathCause | null) ?? null,
      })),
    }))
  }

  /** All game records — the frontend filters and aggregates client-side. */
  async records() {
    return this.loadRecords()
  }

  async leaderboard(minGames = DEFAULT_MIN_GAMES) {
    const records = await this.loadRecords()
    return { minGames, entries: computeLeaderboard(records, { minGames }) }
  }

  async roles() {
    return computeRoleStats(await this.loadRecords())
  }

  async global() {
    return computeGlobalStats(await this.loadRecords())
  }

  /** Role sets already played per player count, sorted by frequency × feedback. */
  async setSuggestions() {
    return computeSetSuggestions(await this.loadRecords())
  }

  async player(playerId: string) {
    const records = await this.loadRecords()
    const entry = computeLeaderboard(records, { minGames: 1 }).find((e) => e.playerId === playerId) ?? null
    const roleStats = computePlayerRoleStats(records).filter((s) => s.playerId === playerId)
    return { entry, roleStats }
  }
}
