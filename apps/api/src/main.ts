import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'
import type { Env } from './config/env'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)
  app.use(cookieParser())

  const config = app.get<ConfigService<Env, true>>(ConfigService)
  app.enableCors({ origin: config.get('WEB_ORIGIN', { infer: true }), credentials: true })

  const port = config.get('API_PORT', { infer: true })
  await app.listen(port)
  // eslint-disable-next-line no-console
  console.log(`Werewolf API listening on :${port}`)
}

void bootstrap()
