import { BadRequestException, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { apiError, getRole, ROLE_CATALOG_VERSION } from '@werewolf/shared'
import { PrismaService } from '../prisma/prisma.service'
import { AppStateService } from './app-state.service'

const SPECIAL_VILLAGE = ['seer', 'witch', 'hunter', 'cupid', 'fox', 'elder', 'bear-tamer', 'little-girl']
const SOLO_ROLES = ['pied-piper', 'white-werewolf']
const DEATH_CAUSES = ['werewolf', 'witch-poison', 'lynch', 'hunter', 'heartbreak'] as const
const DAY_MS = 86_400_000

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}
function chance(p: number): boolean {
  return Math.random() < p
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

@Injectable()
export class TestDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appState: AppStateService,
  ) {}

  async generate(count: number): Promise<{ created: number }> {
    if (!(await this.appState.isTestMode())) {
      throw new BadRequestException(apiError('TEST_MODE_REQUIRED', 'Enable test mode first.'))
    }

    let players = await this.prisma.player.findMany({ where: { active: true } })
    if (players.length < 8) {
      await this.createTestPlayers(8 - players.length)
      players = await this.prisma.player.findMany({ where: { active: true } })
    }

    for (let i = 0; i < count; i++) {
      await this.prisma.game.create({ data: this.randomGame(players) })
    }
    return { created: count }
  }

  private async createTestPlayers(n: number): Promise<void> {
    for (let i = 0; i < n; i++) {
      const suffix = Math.random().toString(36).slice(2, 7)
      try {
        await this.prisma.player.create({
          data: { displayName: `Test player ${suffix}`, generated: true },
        })
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e
      }
    }
  }

  private randomGame(allPlayers: { id: string }[]): Prisma.GameCreateInput {
    const n = randInt(6, Math.min(12, allPlayers.length))
    const chosen = shuffle(allPlayers).slice(0, n)

    // Assemble the roles
    const wolves = Math.max(1, Math.round(n / 5))
    const roleIds: string[] = Array.from({ length: wolves }, () => 'werewolf')
    const hasSolo = chance(0.25)
    if (hasSolo) roleIds.push(pick(SOLO_ROLES))
    for (const r of shuffle(SPECIAL_VILLAGE).slice(0, randInt(2, 4))) {
      if (roleIds.length < n) roleIds.push(r)
    }
    while (roleIds.length < n) roleIds.push('villager')
    const roles = shuffle(roleIds).slice(0, n)

    // Determine the winner
    const soloRole = roles.find((r) => SOLO_ROLES.includes(r))
    let winningCondition: string
    if (soloRole && chance(0.15)) winningCondition = soloRole
    else winningCondition = chance(0.52) ? 'village' : 'werewolves'

    const isLive = chance(0.45)
    const rounds = isLive ? randInt(2, 7) : null
    const playedAt = new Date(Date.now() - randInt(0, 180) * DAY_MS - randInt(0, DAY_MS))

    const players = chosen.map((p, i) => {
      const roleId = roles[i]!
      const faction = getRole(roleId)?.faction ?? 'village'
      const isWinner =
        winningCondition === 'village'
          ? faction === 'village'
          : winningCondition === 'werewolves'
            ? faction === 'werewolves'
            : roleId === soloRole
      const survived = isLive ? (isWinner ? chance(0.7) : chance(0.25)) : null
      const diedRound = survived === false && rounds ? randInt(0, rounds - 1) : null
      const deathCause = survived === false ? pick(DEATH_CAUSES) : null
      return {
        player: { connect: { id: p.id } },
        roleId,
        roleVersion: ROLE_CATALOG_VERSION,
        finalFaction: faction,
        isWinner,
        survived,
        diedRound,
        deathCause,
      }
    })

    return {
      mode: isLive ? 'LIVE' : 'QUICK',
      status: 'FINISHED',
      playedAt,
      roleSetVersion: ROLE_CATALOG_VERSION,
      winningCondition,
      rounds,
      // Set feedback as in real life: not after every game.
      setRating: chance(0.6) ? randInt(1, 5) : null,
      generated: true,
      players: { create: players },
    }
  }
}
