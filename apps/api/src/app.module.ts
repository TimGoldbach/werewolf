import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { AppStateModule } from './app-state/app-state.module'
import { AuthGuard } from './auth/auth.guard'
import { AuthModule } from './auth/auth.module'
import { validateEnv } from './config/env'
import { GamesModule } from './games/games.module'
import { HealthModule } from './health/health.module'
import { PlayersModule } from './players/players.module'
import { PrismaModule } from './prisma/prisma.module'
import { StatsModule } from './stats/stats.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    AppStateModule,
    AuthModule,
    PlayersModule,
    GamesModule,
    StatsModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
