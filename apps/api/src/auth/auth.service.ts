import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import type { Env } from '../config/env'

@Injectable()
export class AuthService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  async verifyPassword(password: string): Promise<boolean> {
    const hash = this.config.get('GATE_PASSWORD_HASH', { infer: true })
    if (hash) {
      return bcrypt.compare(password, hash)
    }
    const plain = this.config.get('GATE_PASSWORD', { infer: true })
    return Boolean(plain) && password === plain
  }

  issueToken(): string {
    const secret = this.config.get('SESSION_SECRET', { infer: true })
    const ttl = this.config.get('SESSION_TTL', { infer: true })
    return jwt.sign({ scope: 'gate' }, secret, { expiresIn: ttl as jwt.SignOptions['expiresIn'] })
  }

  verifyToken(token: string | undefined): boolean {
    if (!token) return false
    try {
      jwt.verify(token, this.config.get('SESSION_SECRET', { infer: true }))
      return true
    } catch {
      return false
    }
  }

  /** Whether the session cookie gets the `Secure` flag (see SECURE_COOKIES). */
  get secureCookies(): boolean {
    const configured = this.config.get('SECURE_COOKIES', { infer: true })
    if (configured) return configured === 'true'
    return this.config.get('NODE_ENV', { infer: true }) === 'production'
  }
}
