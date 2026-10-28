import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common'
import {
  createPlayerSchema,
  updatePlayerSchema,
  type CreatePlayerInput,
  type Player,
  type UpdatePlayerInput,
} from '@werewolf/shared'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { PlayersService } from './players.service'

@Controller('players')
export class PlayersController {
  constructor(private readonly players: PlayersService) {}

  @Get()
  list(@Query('includeArchived') includeArchived?: string): Promise<Player[]> {
    return this.players.list(includeArchived === 'true')
  }

  @Post()
  create(@Body(new ZodValidationPipe(createPlayerSchema)) body: CreatePlayerInput): Promise<Player> {
    return this.players.create(body)
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePlayerSchema)) body: UpdatePlayerInput,
  ): Promise<Player> {
    return this.players.update(id, body)
  }
}
