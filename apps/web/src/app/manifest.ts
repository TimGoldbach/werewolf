import type { MetadataRoute } from 'next'
import { getTranslations } from 'next-intl/server'
import { instanceLocale } from '@/i18n/config'
import { getBranding, pngSize } from '@/lib/branding'

// The manifest is fetched without the visitor's cookie, so it uses the instance language.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations({ locale: instanceLocale(), namespace: 'common' })
  const { name, logo } = getBranding()
  const appName = name ?? t('appName')
  const icon = logo
    ? {
        src: logo.url,
        type: logo.type,
        sizes: logo.type === 'image/png' ? (pngSize(logo.file) ?? 'any') : 'any',
      }
    : { src: '/app-icon.svg', type: 'image/svg+xml', sizes: 'any' }
  return {
    name: appName,
    short_name: appName,
    description: t('appDescription'),
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0f',
    theme_color: '#0a0a0f',
    icons: [{ ...icon, purpose: 'any' }],
  }
}
