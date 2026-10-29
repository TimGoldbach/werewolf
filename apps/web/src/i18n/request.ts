import { isLocale } from '@werewolf/shared'
import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { loadMessages } from '../../messages'
import { instanceLocale, instanceTimeZone, LOCALE_COOKIE } from './config'

// No locale in the URL: the language comes from the visitor's cookie, else the instance default.
export default getRequestConfig(async () => {
  const picked = (await cookies()).get(LOCALE_COOKIE)?.value
  const locale = isLocale(picked) ? picked : instanceLocale()
  return {
    locale,
    messages: await loadMessages(locale),
    timeZone: instanceTimeZone(),
  }
})
