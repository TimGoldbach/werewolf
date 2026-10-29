import { Module } from '@nestjs/common'
import { RoleVisibilityController } from './role-visibility.controller'
import { RoleVisibilityService } from './role-visibility.service'

@Module({
  controllers: [RoleVisibilityController],
  providers: [RoleVisibilityService],
})
export class RoleVisibilityModule {}
