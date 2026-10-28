import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import { IS_PUBLIC_KEY, SESSION_COOKIE } from './auth.constants'
import { AuthService } from './auth.service'
import { apiError } from '@werewolf/shared'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest<Request>()
    const token = request.cookies?.[SESSION_COOKIE]
    if (!this.auth.verifyToken(token)) {
      throw new UnauthorizedException(apiError('NOT_AUTHENTICATED', 'Not logged in.'))
    }
    return true
  }
}
