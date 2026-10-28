import type { Messages } from '../messages'

declare global {
  // Typed translation keys for next-intl
  interface IntlMessages extends Messages {}
}
