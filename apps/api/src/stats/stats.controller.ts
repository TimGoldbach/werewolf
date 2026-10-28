import { Controller, Get, Param, Query } from '@nestjs/common'
import { DEFAULT_MIN_GAMES } from '@werewolf/shared'
import { StatsService } from './stats.service'

@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('records')
  records() {
    return this.stats.records()
  }

  @Get('leaderboard')
  leaderboard(@Query('minGames') minGames?: string) {
    const parsed = minGames ? Number.parseInt(minGames, 10) : DEFAULT_MIN_GAMES
    return this.stats.leaderboard(Number.isFinite(parsed) ? parsed : DEFAULT_MIN_GAMES)
  }

  @Get('roles')
  roles() {
    return this.stats.roles()
  }

  @Get('global')
  global() {
    return this.stats.global()
  }

  /** Set suggestions for creating a game — the frontend filters by player count. */
  @Get('set-suggestions')
  setSuggestions() {
    return this.stats.setSuggestions()
  }

  @Get('players/:id')
  player(@Param('id') id: string) {
    return this.stats.player(id)
  }
}
