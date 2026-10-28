'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { cn } from '@/lib/utils'

/** Small (i) — tapping shows a one-liner. Mobile-friendly (no hover). */
export function InfoDot({ text, className }: { text: string; className?: string }) {
  const t = useTranslations('stats')
  const [open, setOpen] = useState(false)
  return (
    <span className={cn('relative inline-flex align-middle', className)}>
      <button
        type="button"
        aria-label={t('infoDotLabel')}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        onBlur={() => setOpen(false)}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-muted-foreground/40 text-[10px] font-semibold leading-none text-muted-foreground hover:text-foreground"
      >
        i
      </button>
      {open && (
        <span className="absolute left-1/2 top-5 z-20 w-52 -translate-x-1/2 rounded-md border border-border bg-card p-2 text-xs font-normal leading-snug text-muted-foreground shadow-lg">
          {text}
        </span>
      )}
    </span>
  )
}
