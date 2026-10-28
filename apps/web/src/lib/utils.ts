import { clsx, type ClassValue } from 'clsx'
import type { createFormatter } from 'next-intl'
import { twMerge } from 'tailwind-merge'

/** next-intl formatter: `useFormatter()` in components, `await getFormatter()` in async server components. */
export type Formatter = ReturnType<typeof createFormatter>

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

/** Decimal number in the active locale, e.g. `12.4` / `12,4`. */
export function formatDecimal(format: Formatter, value: number, digits = 1): string {
  return format.number(value, { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/** Date in the active locale, e.g. `10/28/2026` / `28.10.2026`. */
export function formatDate(format: Formatter, iso: string): string {
  return format.dateTime(new Date(iso), { day: '2-digit', month: '2-digit', year: 'numeric' })
}
