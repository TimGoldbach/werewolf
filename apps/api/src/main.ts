import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'
import type { Env } from './config/env'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  // Requests arrive via the web container (and maybe a reverse proxy) on private networks;
  // trust their X-Forwarded-For so req.ip is the real client (login throttling).
  app.set('trust proxy', 'loopback, linklocal, uniquelocal')
  app.use(cookieParser())

  const config = app.get<ConfigService<Env, true>>(ConfigService)
  app.enableCors({ origin: config.get('WEB_ORIGIN', { infer: true }), credentials: true })

  const port = config.get('API_PORT', { infer: true })
  await app.listen(port)
  // eslint-disable-next-line no-console
  console.log(`Werewolf API listening on :${port}`)
}

void bootstrap()
