'use client'

import { useTranslations } from 'next-intl'
import { createContext, useContext } from 'react'
import { Icon } from '@/components/pixel/icons'
import { cn } from '@/lib/utils'

interface ClientBranding {
  name: string | null
  tagline: string | null
  logoUrl: string | null
}

const BrandingContext = createContext<ClientBranding>({ name: null, tagline: null, logoUrl: null })

/** Hands the instance branding (read on the server, see lib/branding.ts) to client components. */
export function BrandingProvider({
  value,
  children,
}: {
  value: ClientBranding
  children: React.ReactNode
}) {
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
}

export function useBranding(): ClientBranding {
  return useContext(BrandingContext)
}

/** The group's name, or the translated app name when the instance sets none. */
export function useAppName(): string {
  const t = useTranslations('common')
  return useBranding().name ?? t('appName')
}

/** The instance logo, or the pixel wolf without one. Decorative: label the surrounding link instead. */
export function BrandIcon({ size, className }: { size: number; className?: string }) {
  const { logoUrl } = useBranding()
  if (!logoUrl) return <Icon name="wolf" size={size} className={className} />
  // A plain <img>: the logo is served by our own route and may be an SVG.
  return (
    <img
      src={logoUrl}
      alt=""
      width={size}
      height={size}
      className={cn('shrink-0 object-contain', className)}
      style={{ width: size, height: size }}
    />
  )
}
