import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common'
import {
  createQuickGameSchema,
  setGameFeedbackSchema,
  type CreateQuickGameInput,
  type SetGameFeedbackInput,
} from '@werewolf/shared'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { GamesService } from './games.service'

@Controller('games')
export class GamesController {
  constructor(private readonly games: GamesService) {}

  @Get()
  list() {
    return this.games.list()
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.games.get(id)
  }

  @Post('quick')
  createQuick(@Body(new ZodValidationPipe(createQuickGameSchema)) body: CreateQuickGameInput) {
    return this.games.createQuick(body)
  }

  /** Edits the result projection of a finished game after the fact. */
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createQuickGameSchema)) body: CreateQuickGameInput,
  ) {
    return this.games.update(id, body)
  }

  /** The group's feedback on the role set (1–5 stars) — weights the set suggestions. */
  @Put(':id/feedback')
  setFeedback(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setGameFeedbackSchema)) body: SetGameFeedbackInput,
  ) {
    return this.games.setFeedback(id, body)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.games.remove(id)
  }
}
