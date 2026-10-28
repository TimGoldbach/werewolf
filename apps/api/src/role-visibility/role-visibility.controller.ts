import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common'
import {
  applyRolePresetSchema,
  setRoleHiddenSchema,
  type ApplyRolePresetInput,
  type RoleVisibility,
  type SetRoleHiddenInput,
} from '@werewolf/shared'
import { Public } from '../auth/public.decorator'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { RoleVisibilityService } from './role-visibility.service'

@Controller('role-visibility')
export class RoleVisibilityController {
  constructor(private readonly roles: RoleVisibilityService) {}

  /** Public: the rules page hides the same roles and is reachable without the password. */
  @Public()
  @Get()
  get(): Promise<RoleVisibility> {
    return this.roles.get()
  }

  @Post('preset')
  applyPreset(
    @Body(new ZodValidationPipe(applyRolePresetSchema)) body: ApplyRolePresetInput,
  ): Promise<RoleVisibility> {
    return this.roles.applyPreset(body.preset)
  }

  @Put(':roleId')
  setHidden(
    @Param('roleId') roleId: string,
    @Body(new ZodValidationPipe(setRoleHiddenSchema)) body: SetRoleHiddenInput,
  ): Promise<RoleVisibility> {
    return this.roles.setHidden(roleId, body.hidden)
  }
}
