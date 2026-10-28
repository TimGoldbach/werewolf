import { Body, Controller, Get, Post, Req, Res, UnauthorizedException } from '@nestjs/common'
import { apiError, type LoginInput, loginSchema } from '@werewolf/shared'
import type { Request, Response } from 'express'
import { ZodValidationPipe } from '../common/zod-validation.pipe'
import { SESSION_COOKIE, sessionCookieOptions } from './auth.constants'
import { AuthService } from './auth.service'
import { Public } from './public.decorator'

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ authenticated: boolean }> {
    const ok = await this.auth.verifyPassword(body.password)
    if (!ok) throw new UnauthorizedException(apiError('WRONG_PASSWORD', 'Wrong password.'))
    res.cookie(SESSION_COOKIE, this.auth.issueToken(), sessionCookieOptions(this.auth.isProd))
    return { authenticated: true }
  }

  @Public()
  @Get('session')
  session(@Req() req: Request): { authenticated: boolean } {
    return { authenticated: this.auth.verifyToken(req.cookies?.[SESSION_COOKIE]) }
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response): { authenticated: boolean } {
    res.clearCookie(SESSION_COOKIE, { ...sessionCookieOptions(this.auth.isProd), maxAge: undefined })
    return { authenticated: false }
  }
}
