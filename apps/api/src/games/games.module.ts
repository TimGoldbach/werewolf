import { Module } from '@nestjs/common'
import { GamesController } from './games.controller'
import { GamesService } from './games.service'
import { LiveGamesController } from './live-games.controller'
import { LiveGamesService } from './live-games.service'

@Module({
  controllers: [LiveGamesController, GamesController],
  providers: [GamesService, LiveGamesService],
  exports: [GamesService, LiveGamesService],
})
export class GamesModule {}
