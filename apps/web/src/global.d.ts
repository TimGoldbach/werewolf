import type { Messages } from '../messages'

declare module 'next-intl' {
  // Typed translation keys for next-intl
  interface AppConfig {
    Messages: Messages
  }
}
