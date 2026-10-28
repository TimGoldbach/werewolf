import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { LoginThrottle } from './login-throttle'

@Module({
  controllers: [AuthController],
  providers: [AuthService, { provide: LoginThrottle, useValue: new LoginThrottle() }],
  exports: [AuthService],
})
export class AuthModule {}
