import type { Metadata, Viewport } from 'next'
import { Press_Start_2P } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages, getTimeZone, getTranslations } from 'next-intl/server'
import { BrandingProvider } from '@/components/branding'
import { getBranding } from '@/lib/branding'
import './globals.css'

const pixelFont = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common')
  const { name, logo } = getBranding()
  return {
    title: name ?? t('appName'),
    description: t('appDescription'),
    icons: logo
      ? {
          icon: { url: logo.url, type: logo.type },
          apple: logo.type === 'image/png' ? logo.url : undefined,
        }
      : { icon: { url: '/app-icon.svg', type: 'image/svg+xml' } },
  }
}

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, messages, timeZone] = await Promise.all([getLocale(), getMessages(), getTimeZone()])
  const { name, tagline, accent, logo } = getBranding()
  return (
    <html lang={locale} data-accent={accent} className={`dark ${pixelFont.variable}`}>
      <body className="min-h-screen antialiased">
        <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
          <BrandingProvider value={{ name, tagline, logoUrl: logo?.url ?? null }}>
            {children}
          </BrandingProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
