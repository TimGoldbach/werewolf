import { Body, Controller, Get, Post } from '@nestjs/common'
import {
  generateGamesSchema,
  setTestModeSchema,
  type GenerateGamesInput,
  type SetTestModeInput,
} from '@werewolf/shared'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { AppStateService } from './app-state.service'
import { TestDataService } from './test-data.service'

@Controller('test-mode')
export class TestModeController {
  constructor(
    private readonly appState: AppStateService,
    private readonly testData: TestDataService,
  ) {}

  @Get()
  async get(): Promise<{ active: boolean }> {
    const state = await this.appState.getState()
    return { active: state.testMode }
  }

  @Post()
  set(@Body(new ZodValidationPipe(setTestModeSchema)) body: SetTestModeInput) {
    return this.appState.setTestMode(body.active)
  }

  @Post('generate')
  generate(@Body(new ZodValidationPipe(generateGamesSchema)) body: GenerateGamesInput) {
    return this.testData.generate(body.count)
  }
}
