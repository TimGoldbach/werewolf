import { Global, Module } from '@nestjs/common'
import { AppStateService } from './app-state.service'
import { TestDataService } from './test-data.service'
import { TestModeController } from './test-mode.controller'

@Global()
@Module({
  controllers: [TestModeController],
  providers: [AppStateService, TestDataService],
  exports: [AppStateService],
})
export class AppStateModule {}
