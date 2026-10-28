import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import {
  createLiveGameSchema,
  updateLiveSettingsSchema,
  type CreateLiveGameInput,
  type UpdateLiveSettingsInput,
} from '@werewolf/shared'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { LiveGamesService } from './live-games.service'

@Controller('games')
export class LiveGamesController {
  constructor(private readonly live: LiveGamesService) {}

  @Post('live')
  create(@Body(new ZodValidationPipe(createLiveGameSchema)) body: CreateLiveGameInput) {
    return this.live.create(body)
  }

  @Get(':id/state')
  state(@Param('id') id: string) {
    return this.live.getState(id)
  }

  /** Lightweight version signal for live polling: changes whenever the log changes. */
  @Get(':id/version')
  version(@Param('id') id: string) {
    return this.live.getVersion(id)
  }

  @Patch(':id/settings')
  settings(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateLiveSettingsSchema)) body: UpdateLiveSettingsInput,
  ) {
    return this.live.updateSettings(id, body)
  }

  @Post(':id/events')
  append(@Param('id') id: string, @Body() body: { type: string; payload?: Record<string, unknown> }) {
    return this.live.appendEvent(id, body)
  }

  @Post(':id/undo')
  undo(@Param('id') id: string) {
    return this.live.undo(id)
  }

  @Post(':id/finish')
  finish(
    @Param('id') id: string,
    @Body() body: { winningCondition?: string; winnerIds?: string[] },
  ) {
    return this.live.finish(id, body)
  }
}
