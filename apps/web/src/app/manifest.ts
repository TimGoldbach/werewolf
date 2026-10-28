import type { MetadataRoute } from 'next'
import { getTranslations } from 'next-intl/server'
import { instanceLocale } from '@/i18n/config'

// The manifest is fetched without the visitor's cookie, so it uses the instance language.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations({ locale: instanceLocale(), namespace: 'common' })
  return {
    name: t('appName'),
    short_name: t('appName'),
    description: t('appDescription'),
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0f',
    theme_color: '#0a0a0f',
    icons: [{ src: '/app-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  }
}
